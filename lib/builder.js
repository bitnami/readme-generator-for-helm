/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/*
* Build sections of parameters combining real values with parsed metadata and modifiers
* Params:
*   - valuesObject: object with the real values built from the YAML.
*   - valuesMetadata: full metadata object parsed from comments including sections and values
*                     values can contain modifiers
* Returns: array of sections' lines, the first line is the section title
*/
function buildSections(valuesObject, valuesMetadata) {
  // Insert sections to the final values object
  const sections = [];
  valuesMetadata.forEach((obj, i) => {
    if (obj.section) {
      const section = [];
      section.push(obj); // Add section header
      let nextSectionFound = false;
      valuesMetadata.slice(i + 1).forEach((param) => {
        const parameter = { ...param };
        if (!nextSectionFound && !parameter.section) {
          if (!parameter.value) {
            // Find the value in the real values object
            let paramIndex = valuesObject.findIndex((e) => e.name === parameter.name);
            // If there is not an exact match of the parameter search the one starting with the name,
            // this has sense when the parameter is an array and the real path contains '[' or
            // when two parameter's names start with the same, for example: service.port and service.portEnabled
            if (paramIndex === -1) {
              // There is not an exact match, the parameter is an array
              paramIndex = valuesObject.findIndex((e) => e.name.startsWith(parameter.name));
            }
            // Set value from real object if there are not modifiers
            parameter.value = valuesObject[paramIndex].value;
          }
          if (parameter.extra) {
            parameter.value = '';
          }
          section.push(parameter); // Add param to section body
        } else {
          nextSectionFound = true;
        }
      });
      sections.push(section);
    }
  });

  return sections;
}

module.exports = {
  buildSections,
};
