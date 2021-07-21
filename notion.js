const Client = require("@notionhq/client").Client;

const makeScenarioSection = (lines, type) => {
    if (lines.length === 0) {
        return [];
    }
    const scenarioLines = lines.map((l, i) => {
        const startingLabel = i === 0 ? type : "And";
        if (l.startsWith("#") || l.startsWith("|")) {
            // if line starts with #, it's a comment
            return [
                {
                    type: "text",
                    text: { content: ` ${l}\n` },
                    annotations: { code: true },
                },
            ];
        } else {
            return [
                {
                    type: "text",
                    text: { content: startingLabel },
                    annotations: { bold: true },
                },
                {
                    type: "text",
                    text: { content: ` ${l}\n` },
                },
            ];
        }
    });
    return scenarioLines.flat();
};

const createFeatureFileObject = (
    databaseId,
    { key, name, userStory, background, scenarios }
) => {
    const scenariosObject = scenarios.map((scenario) => {
        const heading = {
            object: "block",
            type: "heading_2",
            heading_2: {
                text: [
                    {
                        type: "text",
                        text: {
                            content: `${scenario.type}: ${scenario.name}`,
                        },
                    },
                ],
            },
        };

        const given = makeScenarioSection(scenario.given, "Given");
        const when = makeScenarioSection(scenario.when, "When");
        const then = makeScenarioSection(scenario.then, "Then");
        // TODO: FIX THIS ONCE THE NOTION API ALLOWS CODE BLOCKS
        const examples = []; //makeScenarioSection(scenario.examples, "Examples");

        const scenarioBody = {
            object: "block",
            type: "paragraph",
            paragraph: {
                text: [given, when, then, examples].flat(),
            },
        };

        return [heading, scenarioBody].flat();
    });

    const children = [];
    if (background) {
        children.push(
            {
                object: "block",
                type: "heading_2",
                heading_2: {
                    text: [
                        {
                            type: "text",
                            text: {
                                content: "Background",
                            },
                        },
                    ],
                },
            },
            {
                object: "block",
                type: "paragraph",
                paragraph: {
                    text: [
                        {
                            type: "text",
                            text: {
                                content: background,
                            },
                        },
                    ],
                },
            }
        );
    }
    children.push(...scenariosObject);

    return {
        parent: {
            database_id: databaseId,
        },
        properties: {
            Feature: {
                title: [
                    {
                        text: {
                            content: key ? `${key} - ${name}` : name, // if no key, use name
                        },
                    },
                ],
            },
            "User Story": {
                rich_text: [
                    {
                        text: {
                            content: userStory,
                        },
                    },
                ],
            },
        },
        children: children.flat(),
    };
};

const clearFeatureFiles = async (databaseId) => {
    const notion = new Client({ auth: process.env.NOTION_KEY });
    const pages = await notion.databases.query({ database_id: databaseId });
    await Promise.all(
        pages.results.map(async (pg) => {
            return await notion.pages.update({
                page_id: pg.id,
                archived: true,
            });
        })
    );
};

const newNotionFeatureFile = async (
    databaseId,
    { key, name, userStory, background, scenarios }
) => {
    const notion = new Client({ auth: process.env.NOTION_KEY });
    const featureFileObject = createFeatureFileObject(databaseId, {
        key,
        name,
        userStory,
        background,
        scenarios,
    });
    const featureFile = await notion.pages.create(featureFileObject);
    return featureFile;
};

module.exports = { clearFeatureFiles, newNotionFeatureFile };
