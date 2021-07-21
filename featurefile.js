const fs = require("fs");
const { newNotionFeatureFile } = require("./notion");

class FeatureFile {
    constructor(name, userStory, background, scenarios, key) {
        this.name = name;
        this.userStory = userStory;
        this.background = background;
        this.scenarios = scenarios;
        this.key = key;
    }

    async sendToNotion(databaseId) {
        return await newNotionFeatureFile(databaseId, {
            key: this.key,
            name: this.name,
            userStory: this.userStory,
            background: this.background,
            scenarios: this.scenarios,
        });
    }

    static async parseFromFile(filePath, key) {
        const featureFileContent = await fs.promises.readFile(filePath);

        if (!key) {
            try {
                const fileParts = filePath.split("/").slice(-3);
                const indices = fileParts.map((part) =>
                    parseInt(part.split("-")[0])
                );
                key = indices.join(".");
                if (key.includes("NaN")) {
                    key = false;
                }
            } catch (e) {}
        }
        console.log(key);

        let featureName = "";
        let userStory = "";
        let background = "";
        let scenarios = [];

        let parsingBackground = false;
        let parsingScenario = false;
        let parsingScenarioOutline = false;
        let scenario = {
            name: "",
            type: "",
            given: [],
            when: [],
            then: [],
            examples: [],
        };
        let blanklines = 0; // number of consecutive blank lines
        let hasExamples = false;

        const featureFileLines = featureFileContent.toString().split("\n");

        featureFileLines.forEach((line) => {
            const trimmedLine = line.trim();

            // keep track of # of blank lines
            if (trimmedLine === "") {
                blanklines++;
            } else {
                blanklines = 0;
            }

            if (trimmedLine.startsWith("Feature:")) {
                // this line is the feature name
                featureName = trimmedLine.replace("Feature: ", "");
            }

            // user story
            if (
                trimmedLine.startsWith("As a") ||
                trimmedLine.startsWith("I want") ||
                trimmedLine.startsWith("So that")
            ) {
                userStory = userStory + "\n" + trimmedLine;
            }
            if (userStory.startsWith("\n")) {
                userStory = userStory.substring(1);
            }

            // background
            if (trimmedLine.startsWith("Background:")) {
                parsingBackground = true;
            } else if (parsingBackground) {
                if (blanklines != 0) {
                    parsingBackground = false;
                }

                background = background + "\n" + trimmedLine;
            }
            if (background.startsWith("\n")) {
                background = background.substring(1);
            }

            // scenarios
            if (
                trimmedLine.startsWith("Scenario") ||
                parsingScenario ||
                parsingScenarioOutline
            ) {
                if (trimmedLine.startsWith("Scenario:")) {
                    if (parsingScenario || parsingScenarioOutline) {
                        // already parsing a scenario, so this is a new one
                        scenarios.push(scenario);
                        scenario = {
                            name: "",
                            type: "",
                            given: [],
                            when: [],
                            then: [],
                            examples: [],
                        };
                        hasExamples = false;
                    }
                    parsingScenario = true;
                    scenario.type = "Scenario";
                    scenario.name = trimmedLine.replace("Scenario: ", "");
                } else if (trimmedLine.startsWith("Scenario Outline:")) {
                    if (parsingScenario || parsingScenarioOutline) {
                        // already parsing a scenario outline, so this is a new one
                        scenarios.push(scenario);
                        scenario = {
                            name: "",
                            type: "",
                            given: [],
                            when: [],
                            then: [],
                            examples: [],
                        };
                        hasExamples = false;
                    }
                    parsingScenario = true;
                    scenario.type = "Scenario Outline";
                    scenario.name = trimmedLine.replace(
                        "Scenario Outline: ",
                        ""
                    );
                } else {
                    // scenario line that is not the name
                    // assumes that Givens alwaways come before the Whens and that Whens always come before Thens
                    if (trimmedLine.startsWith("Given")) {
                        scenario.given.push(trimmedLine.replace("Given ", ""));
                    } else if (trimmedLine.startsWith("When")) {
                        scenario.when.push(trimmedLine.replace("When ", ""));
                    } else if (trimmedLine.startsWith("Then")) {
                        scenario.then.push(trimmedLine.replace("Then ", ""));
                    } else if (trimmedLine.startsWith("And")) {
                        if (
                            scenario.given.length > 0 &&
                            scenario.when.length === 0 &&
                            scenario.then.length === 0
                        ) {
                            scenario.given.push(
                                trimmedLine.replace("And ", "")
                            );
                        } else if (
                            scenario.when.length > 0 &&
                            scenario.then.length === 0
                        ) {
                            scenario.when.push(trimmedLine.replace("And ", ""));
                        } else if (scenario.then.length > 0) {
                            scenario.then.push(trimmedLine.replace("And ", ""));
                        }
                    } else if (trimmedLine.startsWith("Examples:")) {
                        hasExamples = true;
                    } else if (hasExamples) {
                        if (trimmedLine.length > 0) {
                            scenario.examples.push(trimmedLine);
                        }
                    }
                }
            }
        });

        // push the last scenario
        if (scenario.name !== "") {
            scenarios.push(scenario);
        }

        return new FeatureFile(
            featureName,
            userStory,
            background,
            scenarios,
            key
        );
    }
}

module.exports = FeatureFile;
