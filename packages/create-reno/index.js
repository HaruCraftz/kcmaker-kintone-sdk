import path from 'node:path';
import fs from 'fs-extra';
import prompts from 'prompts';
import tiged from 'tiged';
import colors from 'picocolors';
import { Command } from 'commander';

const { blue, cyan, red, yellow } = colors;

const TEMPLATES = {
    'customize-vanilla-ts': {
        title: 'customize(vanilla-ts)',
        repo: 'HaruCraftz/reno-kintone-sdk/templates/customize/vanilla-ts',
        color: cyan,
    },
    'customize-vanilla-js': {
        title: 'customize(vanilla-js)',
        repo: 'HaruCraftz/reno-kintone-sdk/templates/customize/vanilla-js',
        color: yellow,
    },
};

const program = new Command();

program
    .argument('[project-name]', 'プロジェクト名')
    .option('-t, --template <type>', 'テンプレートタイプ')
    .parse(process.argv);

/**
 * @param { keyof TEMPLATES } templateType
 * @returns { string }
 */
function getTemplateFromOption(templateType) {
    return (TEMPLATES[templateType] ?? TEMPLATES['app']).repo;
}

async function main() {
    try {
        /** @type { string | undefined } */
        let projectName;
        /** @type { string | undefined } */
        let template;

        if (program.args[0] && program.opts().template) {
            // CLIオプション使用時
            projectName = program.args[0];
            template = getTemplateFromOption(program.opts().template);
        } else {
            // 対話モード
            const response = await prompts([
                {
                    type: 'text',
                    name: 'projectName',
                    message: 'Project name:',
                    initial: 'my-kintone-app',
                },
                {
                    type: 'select',
                    name: 'template',
                    message: 'Select a template:',
                    choices: Object.values(TEMPLATES).map((t) => ({ title: t.color(t.title), value: t.repo })),
                },
                {
                    onCancel: () => {
                        throw new Error(red('✖') + ' Operation cancelled');
                    },
                },
            ]);
            projectName = response.projectName;
            template = response.template;
        }

        if (!projectName) {
            console.error(red('Error: Project name is required'));
            process.exit(1);
        }

        const targetDir = path.join(process.cwd(), projectName);

        // ディレクトリが既に存在するかチェック
        if (fs.pathExistsSync(targetDir)) {
            console.error(red(`Error: Directory ${projectName} already exists`));
            process.exit(1);
        }

        console.log(blue(`\nCreating project in ${targetDir}...\n`));

        // リポジトリをクローン
        const emitter = tiged(template, {
            cache: false,
            force: true,
            verbose: true,
        });

        await emitter.clone(targetDir);

        console.log('\nDone. Now run:\n');
        console.log(`\ncd ${projectName}\nnpm install`);
    } catch (error) {
        console.error(red(error));
        process.exit(1);
    }
}

main();
