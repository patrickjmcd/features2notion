#!/usr/bin/env node
const commander = require("commander");
const path = require("path");
const glob = require("glob");
const { newNotionFeatureFile, clearFeatureFiles } = require("./notion");
const FeatureFile = require("./featurefile");

commander.version("0.1");

// const main2 = async () => {
//     const databaseId = process.env.NOTION_DATABASE_ID;
//     await clearFeatureFiles(databaseId);
//     const ff = await FeatureFile.parseFromFile(
//         "/Users/patrickjmcd/github/meshifyiot/insights/cypress/integration/01-login-to-the-dashboard/01-visit-the-login-page/02-login-with-carbon-account.feature"
//     );
//     // console.log(JSON.stringify(ff, null, 4));
//     const notionFile = await ff.sendToNotion(databaseId);
//     console.log(JSON.stringify(notionFile, null, 4));
// };
// main2();

const getAllFeatureFiles = async (dirName, recursive) => {
    const globPart = recursive ? "**/*.feature" : "*.feature";
    const directory =
        dirName.slice(-1) === "/" ? dirName.slice(0, -1) : dirName;
    // if the user specifies a .feature file, use the exact path
    const globSearch =
        dirName.split(".").pop() === "feature"
            ? dirName
            : `${directory}/${globPart}`;
    return new Promise((resolve, reject) => {
        glob.glob(globSearch, function (err, files) {
            if (err) {
                reject(err);
            }
            resolve(files);
        });
    });
};

commander
    .description("Create html from feature files")
    .argument("<databaseId>", "Notion Database Id")
    .option(
        "-i, --input-dir <inputDir>",
        "read feature files from path",
        path.resolve(__dirname, "examples/features")
    )
    .option(
        "-r, --recursive",
        "recurse into subfolders to look for feature files",
        false
    )
    .action(async (databaseId, options) => {
        const allFiles = await getAllFeatureFiles(
            options.inputDir,
            options.recursive
        );

        // const databaseId = process.env.NOTION_DATABASE_ID;
        await clearFeatureFiles(databaseId);
        console.log("cleared all feature files");
        const files = Promise.all(
            allFiles.map(async (file) => {
                const featureFile = await FeatureFile.parseFromFile(file);
                const created = await featureFile.sendToNotion(databaseId);
                // console.log(created);
            })
        );
    });

// parse commands
commander.parse(process.argv);
