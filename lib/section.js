/*
* Copyright 2022-2022 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

class Section {
  constructor(name) {
    /* Section information */
    // The section name
    this.name = name;
    // The section description, line by line
    this.descriptionLines = [];
    // The parameters within this section
    this.parameters = [];
  }

  addDescriptionLine(line) {
    this.descriptionLines.push(line);
  }

  addParameter(parameter) {
    this.parameters.push(parameter);
  }

  get description() {
    return this.descriptionLines.join('\r\n');
  }
}

module.exports = Section;
