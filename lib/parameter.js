/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

class Parameter {
  constructor(name) {
    /* Parameter information */
    // The parameter path using dot notation
    this.name = name;
    // The parameter description
    this.description = '';
    // The parameter value
    this.value = undefined;
    // The parameter type
    this.type = '';

    /* Extra metadata about the parameter */
    // The modifiers applied to the parameter as an array of strings
    this.modifiers = [];
    // The section the parameter belongs to
    this.section = '';

    /* Properties to manage tool behaviour for this parameter */
    // Skips the check of the parameter
    this.validate = true;
    // Whether to render the paramter into the README
    this.readme = true;
    // Whether to render the paramter into the schema
    this.schema = true;
  }

  // Extra parameters won't be checked but will be rendered on the README
  set extra(extra) {
    if (extra) {
      this.validate = false;
      this.readme = true;
    }
  }

  get extra() {
    return (!this.validate && this.readme);
  }

  set skip(skip) {
    if (skip) {
      this.validate = false;
      this.readme = false;
    } else {
      this.validate = true;
      this.readme = true;
    }
  }

  get skip() {
    return (!this.validate && !this.readme);
  }
}

module.exports = Parameter;
