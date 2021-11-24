/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

class Parameter {
  constructor(name) {
    this.name = name;                         // The parameter path using dot notation
    this.value = undefined;                   // The parameter value
    this.type = "";                           // The parameter type
    this._modifier = "";                       // The modifier applied to the paramer
    this.renderActualValue = true;              // If the actual value of the parameter has to be rendered into the README
    this.description = "";                    // The parameter description
    this.section = "";                        // The section the parameter belongs to
    this._skip = false;                        // Skips the check and renderization of the parameter
    this.extra = false;                       // If the parameter is an extra parameter
    this.forceRenderIntoSchema = false;        // Force a parameter to apear in the schema
  }

  get modifier() {
    return this._modifier;
  }
  set modifier(modifier) {
    if (modifier) {
      this.renderActualValue = false; // Add a modifier implies to not render the actual value
      this._modifier = modifier;
    } else {
      this.renderActualValue = true;
      this._modifier = "";
    }
  }

  get skip() {
    return this._skip;
  }
  set skip(skip) {
    if (skip) {
      this.renderActualValue = false; // If skip is true the parameter must not be rendered
    } else {
      this.renderActualValue = true;
    }
    this._skip = skip;
  }
}

module.exports = Parameter;