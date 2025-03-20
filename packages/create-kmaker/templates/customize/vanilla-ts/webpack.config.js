import path from 'path';
import fg from 'fast-glob';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import { merge } from 'webpack-merge';

/**
 * @param {Object} param
 * @param {string} param.mode - 'production' | 'development'
 * @param {string} param.outDir - 出力ディレクトリ
 * @param {Object} param.appsConfig - アプリ設定情報
 * @returns {import('webpack').Configuration}
 */
export default function getWebpackConfig({ mode, outDir, appsConfig }) {
  const cwd = process.cwd();

  // エントリーポイント
  const entryPath = '**/{desktop,mobile}/index.{ts,js}';
  const baseDir = path.posix.join(cwd, 'src', 'apps');
  const files = fg.sync(entryPath, { cwd: baseDir }); // パス検索
  const entries = Object.fromEntries(
    files.map((file) => {
      const [appName, platform] = path.dirname(file).split(path.posix.sep);
      return [`${appName}/customize.${platform}`, path.posix.join(baseDir, file)];
    })
  );

  /** webpack共通設定 */
  const commonConfig = {
    mode,
    target: ['web', 'es2023'],
    entry: entries,
    output: {
      filename: '[name].js',
      path: path.resolve(cwd, outDir),
    },
    optimization: {
      emitOnErrors: false,
    },
    cache: {
      type: 'filesystem',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: 'tsconfig.json',
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loader: 'ts-loader',
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.s[ac]ss$/,
          use: [
            MiniCssExtractPlugin.loader, // Creates `style` nodes from JS strings
            'css-loader', // Translates CSS into CommonJS
            'sass-loader', // Compiles Sass to CSS
          ],
        },
      ],
    },
    plugins: [
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new webpack.DefinePlugin({
        APPS_CONFIG: JSON.stringify(appsConfig),
      }),
    ],
  };

  /** webpack環境別設定 - production */
  const prodConfig = {
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: { format: { comments: false } },
          extractComments: false,
        }),
      ],
    },
  };

  /** webpack環境別設定 - development */
  const devConfig = {
    devtool: 'inline-source-map',
  };

  switch (mode) {
    case 'production':
      return merge(commonConfig, prodConfig);
    case 'development':
      return merge(commonConfig, devConfig);
    default:
      throw new Error(`Invalid build mode: ${mode}`);
  }
}
