/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

const fs = require('fs');
const table = require('markdown-table');

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
 * Updates the Schema of an object
 * Inputs:
 *  - value: Value that we are generating the schema for. Includes: 'type', 'description', and 'value'.
 *  - tree: Array containing the Value dict tree. For example "global.sample" => ["global", "sample"].
 *  - properties: Schema object properties that will be update. Ref: https://github.com/OAI/OpenAPI-Specification/blob/3.1.0/versions/3.1.0.md#schema-object
 *  - ignoreDefault: If true, the Value default is ignored.
 */
function generateSchema(value, tree, properties, ignoreDefault = false) {
  let propertiesAux = properties;
  // Write schema for the value tree.
  for (let i = 0; i < tree.length; i += 1) {
    // If it is the last component of the tree, write its type and default value
    if (i === tree.length - 1) {
      propertiesAux[tree[i]] = {
        type: value.type,
        default: value.value,
        description: value.description,
      };
      if (ignoreDefault) {
        delete propertiesAux[tree[i]].default;
      }
    } else {
      // This is required to handle 'Array of objects' values, like extraEnvVars[0].name and extraEnvVars[0].value.
      // These values are instead stored in an Array type with items.
      let isArray = false;
      const arrayMatch = tree[i].match(/^(.+)\[.+\]$/);
      let key;
      if (arrayMatch && arrayMatch.length > 0) {
        /* eslint-disable prefer-destructuring */
        key = arrayMatch[1];
        isArray = true;
      } else {
        key = tree[i];
      }
      if (isArray) {
        if (!Object.prototype.hasOwnProperty.call(propertiesAux, key)) {
          // Defines Array schema for "extraEnvVars"
          propertiesAux[key] = {
            type: 'array',
            description: value.description,
            items: {
              type: 'object',
              properties: {},
            },
          };
        }
        // Creates the schema for the items in the array. Items defaults are ignored.
        generateSchema(value, tree.splice(i + 1), propertiesAux[key].items.properties, true);
        // Break the loop, as the array of objects is the last component.
        break;
      // If it is not an array and the value didn't exists, adds another block to the chain.
      } else if (!Object.prototype.hasOwnProperty.call(propertiesAux, key)) {
        propertiesAux[key] = {
          type: 'object',
          properties: {},
        };
      }
      // Updates the propertiesAux for the next tree component
      propertiesAux = propertiesAux[key].properties;
    }
  }
}

/*
 * Creates a Values Schema using the OpenAPIv3 specification.
 * Ref: https://github.com/OAI/OpenAPI-Specification/blob/3.1.0/versions/3.1.0.md#schema-object
 */

function createValuesSchema(values) {
  const schema = {
    title: 'Chart Values',
    type: 'object',
    properties: {},
  };

  values.forEach((value) => {
    const tree = value.name.split('.');
    generateSchema(value, tree, schema.properties);
  });
  return schema;
}

/*
 * Export metadata as JSON.
 */
function exportMetadata(metadataPath, metadataObject) {
  const schema = createValuesSchema(metadataObject);

  fs.writeFileSync(metadataPath, JSON.stringify(schema));
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

module.exports = {
  insertReadmeTable,
  exportMetadata,
  createValuesSchema,
};
