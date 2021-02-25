#!/usr/bin/env node

const { program } = require('commander');
const { createValuesObject, parseMetadataComments } = require('./lib/parser');
const { checkKeys } = require('./lib/checker');
const { buildSections } = require('./lib/builder');
const { insertReadmeTable } = require('./lib/render');

/** DOCS:
 * The comments structure for a parameter is "## @param (FullKeyPath)[Modifier?] Description"
 * The comments structure for a section is "## @section Section Title"
 * Modifiers: they allow to force a value for a parameter.
 * Modifiers supported: [array] Indicates the key is for an array to set the description as '[]'.
 *                      [object] Indicates the key is for an object to set the description as '[]'.
 * The only not supported case is when we add an array with actual values. Test what happens, maybe it prints the array values
 */

program
  .requiredOption('-r, --readme <path>', 'Path to the README.md file')
  .requiredOption('-v, --values <path>', 'Path to the values.yaml file')
  .option('-c, --config <path>', 'Path to the config file');

program.parse(process.argv);

const options = program.opts();
const valuesFilePath = options.values;
const readmeFilePath = options.readme;
const configPath = options.config ? options.config : `${__dirname}/config.json`;
const CONFIG = require(configPath);

const valuesObject = createValuesObject(valuesFilePath);
let valuesMetadata = parseMetadataComments(valuesFilePath, CONFIG);

// Check the parsed keys are consistent with the real ones
checkKeys(valuesObject, valuesMetadata);

// We don't need the skip objects anymore so filter them
valuesMetadata = valuesMetadata.filter((el) => el.skip ? false : true);

// Build sections array combining metadata and real values
const sections = buildSections(valuesObject, valuesMetadata);

insertReadmeTable(readmeFilePath, sections, CONFIG);
