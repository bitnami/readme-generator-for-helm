/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable no-console */

const fs = require('fs');
const table = require('markdown-table');
const { cloneDeep } = require('lodash');

const utils = require('./utils');

/*
 * Converts an array of objects of the same type to markdown table
 */
function createMarkdownTable(objArray) {
  const modifiedArray = objArray.map((e) => {
    if (e.value === '') {
      e.value = '""';
    }
    if (typeof e.value === 'object') {
      // the stringify prints the string '{}' or '[]'
      e.value = JSON.stringify(e.value);
    }
    return [`\`${e.name}\``, e.description, e.extra ? '' : `\`${e.value}\``];
  });

  return table([
    ['Name', 'Description', 'Value'],
    ...modifiedArray,
  ]);
}

/*
 * Returns the section rendered
 */
function renderSection({name, description, parameters}, lineNumberSigns) {
  let sectionTable = '';
  sectionTable += '\r\n';
  sectionTable += `${lineNumberSigns} ${name}\r\n\n`; // section header
  if (description != '') {
    sectionTable += `${description}\r\n\n`; // section description
  }
  if (parameters.length > 0) {
    sectionTable += createMarkdownTable(parameters); // section body parameters
  }
  sectionTable += '\r\n\n';
  return sectionTable;
}

/*
 * Returns the README's table as string
 */
function renderReadmeTable(sections, lineNumberSigns) {
  let fullTable = '';
  /* eslint-disable no-restricted-syntax */
  for (const section of sections) {
    fullTable += renderSection(section, lineNumberSigns);
  }
  return fullTable;
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
      const nextSectionRegExp = new RegExp(`^${lineNumberSigns}\\s`); // Match same level section
      if (!nextSectionFound
        && line.match(nextSectionRegExp)) {
        console.log(`INFO: Found section end at: ${line}`);
        paramsSectionLimits.push(i + paramsSectionLimits[0]);
        nextSectionFound = true;
      } else if (!nextSectionFound && paramsSectionLimits[0] + i + 2 === lines.length) {
        // The parameters section is the last section in the file
        paramsSectionLimits.push(i + 2 + paramsSectionLimits[0]);
        nextSectionFound = true;
        console.log('INFO: The parameters section seems to be the last section in the file');
      }
    });
    // Detect last table-like line bottom to top to ignore description text between tables
    let lastTableLikeLineFound = false;
    let lastNonTableMatchInLine = 0;
    const endParamsSectionRegExp = new RegExp('(?!.*\\|).*\\S(?<!\\|.*)(?<!#.*)'); // Match non empty or with non table format lines
    lines.slice(paramsSectionLimits[0] + 1, paramsSectionLimits[1]).reverse().forEach((line, i) => {
      if (!lastTableLikeLineFound && line && !line.match(endParamsSectionRegExp)) {
        lastTableLikeLineFound = true;
        paramsSectionLimits[1] = paramsSectionLimits[1] - lastNonTableMatchInLine;
        console.log(`INFO: Last parameter table line found at: ${line}`);
      } else if (!lastTableLikeLineFound) {
        lastNonTableMatchInLine = i;
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

/*
 * Updates the Schema of an object
 * Inputs:
 *  - value: Parameter containing: 'type', 'description', 'value' and boolean 'nullable'.
 *  - tree: Array containing the value dict tree. E.g: "a.b" => ["a", "b"].
 *  - properties: Schema object properties that will be updated.
 *    Ref: https://github.com/OAI/OpenAPI-Specification/blob/3.1.0/versions/3.1.0.md#schema-object
 *  - ignoreDefault: If true, the default property is ignored.
 */
function generateSchema(value, tree, properties, ignoreDefault = false) {
  /* eslint-disable no-param-reassign */
  // Write schema for the value tree.
  for (let i = 0; i < tree.length; i += 1) {
    // If it is the last component of the tree, write its type and default value
    if (i === tree.length - 1) {
      properties[tree[i]] = {
        type: value.type,
        description: value.description,
      };
      if (!ignoreDefault) {
        if (value.value == 'null') {
          value.value = null;
        }
        properties[tree[i]].default = value.value;
      }
      if (value.nullable) {
        properties[tree[i]].nullable = true;
      }
      if (value.type == 'array') {
        // The last element of the tree is an array. It is a plain or empty array since if not, the tree would have more elements
        if (value.value != null && value.value.length > 0) {
          properties[tree[i]].items = { type: (typeof value.value[0]) };
        }
      }
    } else {
      // This is required to handle 'Array of objects' values, like a[0].b
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
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          // Defines array schema
          properties[key] = {
            type: 'array',
            description: value.description,
            items: {
              type: 'object',
              properties: {},
            },
          };
        }

        // Creates the schema for the items in the array. Items defaults are ignored.
        generateSchema(value, tree.splice(i + 1), properties[key].items.properties, true);

        // Break the loop, as the array of objects is the last component.
        break;
      // If it is not an array and the value didn't exists, adds another block to the chain.
      } else if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        properties[key] = {
          type: 'object',
          properties: {},
        };
      }
      // Updates the properties for the next tree component
      properties = properties[key].properties;
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
 * Export the information to be rendered into the JSON schema.
 */
function renderOpenAPISchema(schemaFilePath, parametersList, config) {
  let paramsList = cloneDeep(parametersList);
  // Find nil values in the between the parameters.
  const nilValues = paramsList.filter((p) => p.value === 'nil' && !utils.containsModifier(p, config.modifiers.nullable)).map((p) => p.name);
  if (nilValues.length > 0) {
    throw new Error(`Invalid type 'nil' for the following values: ${nilValues.join(', ')}`);
  }

  // For nullable parameters with nil value, we need to convert to OpenAPI 'null'.
  paramsList.forEach((p) => {
    if (p.value === 'nil' && utils.containsModifier(p, config.modifiers.nullable)) {
      console.log('Adding null parameter to the schema');
      p.value = 'null';
    }
  });
  // For nullable parameters we need to set the nullable property in the schema
  paramsList.forEach((p) => {
    if (utils.containsModifier(p, config.modifiers.nullable)) {
      p.nullable = true;
    }
  });

  // Apply modifiers to the type
  paramsList.forEach((p) => {
    if (p.modifiers.length > 0) {
      p.modifiers.forEach((m) => {
        switch(m) {
          case `${config.modifiers.array}`:
            p.type = 'array';
            break;
          case `${config.modifiers.object}`:
            p.type = 'object';
            break;
          case `${config.modifiers.string}`:
            p.type = 'string';
           break;
        }
      });
    }
  });

  // Filter extra parameters since they are not actually in the YAML object
  paramsList = paramsList.filter((p) => !p.extra);
  // The parameters with the "object" modifier must not end in the schema, the actual object should
  // For example:
  // @param a.b [object] Whatever
  // a:
  //   b: "something"
  // "a.b" must be in the schema, while "a" is not an actual entry (Rendered in the README only)
  paramsList = paramsList.filter((p) => !utils.containsModifier(p, config.modifiers.object));
  // Filter the parameters without a value. When there is a modifier a fake parameter is added into the list due to the metadata
  paramsList = paramsList.filter((p) => p.value !== undefined);
  // Render only parameter with schema=true
  paramsList = paramsList.filter((p) => p.schema);

  const schema = createValuesSchema(paramsList);
  fs.writeFileSync(schemaFilePath, JSON.stringify(schema, null, 4));
}

module.exports = {
  insertReadmeTable,
  renderOpenAPISchema,
};
