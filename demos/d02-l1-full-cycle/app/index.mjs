import OpenAI from "openai";
for (const k of ["SCANIOM_NODE_URL","SCANIOM_RUNTIME_TOKEN","SCANIOM_MODEL"]) if (!process.env[k]) throw new Error(`${k} is required`);
const client = new OpenAI({
  baseURL: `${process.env.SCANIOM_NODE_URL.replace(/\/$/,"")}/v1`,
  apiKey: process.env.SCANIOM_RUNTIME_TOKEN,
});
const response = await client.responses.create({model: process.env.SCANIOM_MODEL, input:"Say hello in one sentence"});
console.log(response.output_text);
