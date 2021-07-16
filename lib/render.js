/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

const fs = require('fs');
const table = require('markdown-table');
//const yaml = require('js-yaml');

/*
 * Converts an array of objects of the same type to markdown table
 */
function createMarkdownTable(objArray) {
  const modifiedArray = objArray.map((e) => {
    if (e.value === '') {
      e.value = '""';
    }
    return [`\`${e.name}\``, e.description, `\`${e.value}\``];
  });
  // return CliPrettify.prettify((toTable(modifiedArray, ['name', 'description', 'value'])));
  return table([
    ['Name', 'Description', 'Value'],
    ...modifiedArray,
  ]);
}

/*
 * Returns the section rendered
 */
function renderSection(section, lineNumberSigns) {
  let sectionTable = '';
  sectionTable += '\r\n';
  sectionTable += `${lineNumberSigns} ${section[0].section}\r\n\n`; // section header
  sectionTable += createMarkdownTable(section.slice(1)); // section body parameters
  sectionTable += '\r\n\n';
  return sectionTable;
}

/*
 * Returns the README's table as string
 */
function renderReadmeTable(sections, lineNumberSigns) {
  let fullTable = '';
  sections.forEach((section) => {
    fullTable += renderSection(section, lineNumberSigns);
  });
  return fullTable;
}

/*
 * Export metadata as JSON.
 */
function exportMetadata(metadataPath, metadataObject) {
  //fs.writeFileSync(metadataPath, JSON.stringify(metadataObject));
  const schema = createValuesSchema(metadataObject);
  fs.writeFileSync(metadataPath, JSON.stringify(schema));

  //let yamlStr = yaml.safeDump(schema);
  //fs.writeFileSync('openAPIv3Schema.yaml', yamlStr, 'utf8');
}

/*
 * Add table to README.md
 */
function insertReadmeTable(readmeFilePath, sections, config) {
  const data = fs.readFileSync(readmeFilePath, 'UTF-8');
  const lines = data.split(/\r?\n/);
  let lineNumberSigns; // Store section # starting symbols
  const paramsSectionLimits = [];
  lines.forEach((line, i) => {
    // Find parameters section start
    const match = line.match(new RegExp(`^(##+) ${config.regexp.paramsSectionTitle}`)); // use minimun two # symbols since just one is the README title
    if (match) {
      /* eslint-disable prefer-destructuring */
      lineNumberSigns = match[1];
      paramsSectionLimits.push(i);
      console.log(`INFO: Found parameters section at: ${line}`);
    }
  });
  if (paramsSectionLimits.length === 1) {
    // Find parameters section end
    let nextSectionFound = false;
    lines.slice(paramsSectionLimits[0] + 1).forEach((line, i) => {
      const endParamsSectionRegExp = new RegExp('(?!.*\\|).*\\S(?<!\\|.*)(?<!#.*)'); // Match non empty or with non table format lines
      const nextSectionRegExp = new RegExp(`^${lineNumberSigns}\\s`); // Match same level section
      if (!nextSectionFound
        && (line.match(endParamsSectionRegExp) || line.match(nextSectionRegExp))) {
        console.log(`INFO: Found section end at: ${line}`);
        paramsSectionLimits.push(i + paramsSectionLimits[0]);
        nextSectionFound = true;
      } else if (!nextSectionFound && paramsSectionLimits[0] + i + 2 === lines.length) {
        // The parameters section is the last section in the file
        paramsSectionLimits.push(i + paramsSectionLimits[0]);
        nextSectionFound = true;
        console.log('INFO: The paremeters section seems to be the last section in the file');
      }
    });
  }
  if (paramsSectionLimits.length !== 2) {
    throw new Error('ERROR: error getting current Parameters section from README');
  }

  console.log('INFO: Inserting the new table into the README...');
  // Build the table adding the proper number of # to the section headers
  const newParamsSection = renderReadmeTable(sections, `${lineNumberSigns}#`);
  // Delete the old parameters section
  lines.splice(paramsSectionLimits[0] + 1, paramsSectionLimits[1] - paramsSectionLimits[0]);
  // Add the new parameters section
  lines.splice(paramsSectionLimits[0] + 1, 0, ...newParamsSection.split(/\r?\n/));

  fs.writeFileSync(readmeFilePath, lines.join('\n'));
}

function createValuesSchema(values){
  var schema = {
    title: "Chart Values",
    type: "object",
    properties: {},
  };

  values.forEach(function(value){
    var tree=value.name.split(".");
    var properties = schema.properties;
    var properties_aux = properties;
    for (let i = 0; i < tree.length; i++) {
      if (i == tree.length - 1) {
        properties_aux[tree[i]] = {
          type: value.type,
          default: value.value,
          description: value.description,
        };
      } else {
        if(!properties_aux.hasOwnProperty(tree[i])) {
          properties_aux[tree[i]] = {
            type: "object",
            properties: {},
          }
        }
        properties_aux = properties_aux[tree[i]].properties;
      }
    }
  });
  return schema;
}

module.exports = {
  insertReadmeTable,
  exportMetadata,
  createValuesSchema,
};
