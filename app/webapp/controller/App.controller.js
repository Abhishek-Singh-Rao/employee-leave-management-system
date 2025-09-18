sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("com.company.leavemanagement.controller.App", {
    onInit: function () {
      // Initialize the app controller
      this.getView().addStyleClass(
        this.getOwnerComponent().getContentDensityClass()
      );
    },
  });
});
