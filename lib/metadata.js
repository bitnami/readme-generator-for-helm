/*
* Copyright Broadcom, Inc. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
*/

export default class Metadata {
  constructor() {
    /* Parsed metadata comments */
    // List of available sections
    this.sections = [];
    // All parameters across sections
    this.parameters = [];
  }

  addSection(section) {
    this.sections.push(section);
  }

  addParameter(parameter) {
    this.parameters.push(parameter);
  }
}

