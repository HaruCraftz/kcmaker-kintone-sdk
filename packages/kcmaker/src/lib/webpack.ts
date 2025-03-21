import path from "path";
import { pathToFileURL } from "url";
import webpack, { type Configuration } from "webpack";
import { promisify } from "util";

/**
 * webpack コンフィグモジュールの型
 */
type WebpackConfigFactory = (mode: Kcmaker.BuildMode) => Configuration;

type WebpackConfigModule = Configuration | WebpackConfigFactory;

/**
 * 動的インポート
 * @param filePath - ファイルパス
 */
async function dynamicImport(filePath: string): Promise<unknown> {
  try {
    const url = pathToFileURL(filePath).href;
    return await import(url);
  } catch (error) {
    throw new Error(`Failed to dynamic import ${filePath}:\n${error}`);
  }
}

/**
 * webpack.config モジュールを動的に読み込み、設定が関数かオブジェクトかに応じて返します。
 * @param config - webpack 設定ファイルのパス（例: "webpack.config.js"）
 * @param mode - webpack 設定に渡すビルドモード（"development" | "production"）
 * @returns webpack の設定オブジェクト
 * @throws 読み込み失敗、または想定外のエクスポート形式の場合にエラーを投げます
 */
async function loadWebpackConfig(config: string, mode: Kcmaker.BuildMode): Promise<Configuration> {
  const hasDefaultExport = (mod: unknown): mod is { default: WebpackConfigModule } => {
    return typeof mod === "object" && mod !== null && "default" in mod;
  };

  const isWebpackFactory = (value: unknown): value is WebpackConfigFactory => {
    return typeof value === "function";
  };

  const isWebpackConfigObject = (value: unknown): value is Configuration => {
    return typeof value === "object" && value !== null;
  };

  const configPath = path.resolve(process.cwd(), config);
  const module = await dynamicImport(configPath);
  const configModule = hasDefaultExport(module) ? module.default : module;

  if (isWebpackFactory(configModule)) {
    return configModule(mode);
  }

  if (isWebpackConfigObject(configModule)) {
    return configModule;
  }

  throw new Error(`Unexpected export type from webpack config.`);
}

export async function buildWithWebpack(mode: Kcmaker.BuildMode, config: string, appsConfig: Kcmaker.AppsConfig) {
  console.log("📦 Building with Webpack...\n");

  try {
    // webpack設定読み込み
    const webpackConfig: Configuration = await loadWebpackConfig(config, mode);

    // webpack追加設定
    webpackConfig.mode = mode;
    webpackConfig.plugins ??= [];
    webpackConfig.plugins.push(
      new webpack.DefinePlugin({
        APPS_CONFIG: JSON.stringify(appsConfig),
      }),
    );

    const compiler = webpack(webpackConfig as Configuration);
    const runCompiler = promisify(compiler.run.bind(compiler));
    const stats = await runCompiler();

    if (!stats) {
      throw new Error("Webpack did not return any stats.");
    }

    console.log(
      stats.toString({
        colors: true, // カラー出力を有効化
        modules: false, // モジュール情報を非表示
        children: false, // 子コンパイラ情報を非表示
        chunks: false, // チャンク情報を非表示
        chunkModules: false, // チャンクモジュール情報を非表示
      }),
    );

    if (stats.hasErrors()) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`A fatal error occurred during webpack execution:\n${error}`);
    throw error;
  }
}
