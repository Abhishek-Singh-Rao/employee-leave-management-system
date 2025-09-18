sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/company/leavemanagement/model/formatter",
  ],
  function (Controller, JSONModel, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend(
      "com.company.leavemanagement.controller.LeaveTypes",
      {
        formatter: formatter,

        onInit: function () {
          this._initializeModels();
        },

        _initializeModels: function () {
          var oViewModel = new JSONModel({
            busy: false,
            selectedLeaveType: null,
          });
          this.getView().setModel(oViewModel, "view");
        },

        onAddLeaveType: function () {
          if (!this._oAddLeaveTypeDialog) {
            this._oAddLeaveTypeDialog = sap.ui.xmlfragment(
              "com.company.leavemanagement.fragment.AddLeaveTypeDialog",
              this
            );
            this.getView().addDependent(this._oAddLeaveTypeDialog);
          }
          this._oAddLeaveTypeDialog.open();
        },

        onSaveLeaveType: function () {
          var oModel = this.getView().getModel();
          var oData = {
            code: sap.ui
              .getCore()
              .byId("leaveTypeCodeInput")
              .getValue()
              .toUpperCase(),
            name: sap.ui.getCore().byId("leaveTypeNameInput").getValue(),
            maxDays:
              parseInt(sap.ui.getCore().byId("maxDaysInput").getValue()) || 0,
          };

          // Validation
          if (!oData.code || !oData.name || !oData.maxDays) {
            MessageToast.show("Please fill all required fields");
            return;
          }

          if (oData.maxDays <= 0) {
            MessageToast.show("Maximum days must be greater than 0");
            return;
          }

          var oBinding = oModel.bindList("/LeaveTypes");
          var oContext = oBinding.create(oData);

          oContext
            .created()
            .then(
              function () {
                MessageToast.show("Leave type created successfully");
                this.onCancelAddLeaveType();
                this._refreshTable();
              }.bind(this)
            )
            .catch(function (oError) {
              MessageToast.show("Error creating leave type: " + oError.message);
            });
        },

        onCancelAddLeaveType: function () {
          this._oAddLeaveTypeDialog.close();
          this._clearAddLeaveTypeForm();
        },

        _clearAddLeaveTypeForm: function () {
          sap.ui.getCore().byId("leaveTypeCodeInput").setValue("");
          sap.ui.getCore().byId("leaveTypeNameInput").setValue("");
          sap.ui.getCore().byId("maxDaysInput").setValue("");
        },

        onDeleteLeaveType: function (oEvent) {
          var that = this;
          var oContext = oEvent.getSource().getBindingContext();
          var sLeaveTypeName = oContext.getProperty("name");

          MessageBox.confirm(
            "Are you sure you want to delete leave type: " +
              sLeaveTypeName +
              "?",
            {
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  oContext
                    .delete()
                    .then(function () {
                      MessageToast.show("Leave type deleted successfully");
                      that._refreshTable();
                    })
                    .catch(function (oError) {
                      MessageToast.show(
                        "Error deleting leave type: " + oError.message
                      );
                    });
                }
              },
            }
          );
        },

        onEditLeaveType: function (oEvent) {
          var oContext = oEvent.getSource().getBindingContext();
          var oLeaveTypeData = oContext.getObject();

          if (!this._oEditLeaveTypeDialog) {
            this._oEditLeaveTypeDialog = sap.ui.xmlfragment(
              "editLeaveTypeDialog",
              "com.company.leavemanagement.fragment.EditLeaveTypeDialog",
              this
            );
            this.getView().addDependent(this._oEditLeaveTypeDialog);
          }

          // Populate edit form with current data
          sap.ui.core.Fragment.byId(
            "editLeaveTypeDialog",
            "editLeaveTypeCodeInput"
          ).setValue(oLeaveTypeData.code);
          sap.ui.core.Fragment.byId(
            "editLeaveTypeDialog",
            "editLeaveTypeNameInput"
          ).setValue(oLeaveTypeData.name);
          sap.ui.core.Fragment.byId(
            "editLeaveTypeDialog",
            "editMaxDaysInput"
          ).setValue(oLeaveTypeData.maxDays.toString());

          // Store context for later use
          this.getView()
            .getModel("view")
            .setProperty("/selectedLeaveType", oContext);
          this._oEditLeaveTypeDialog.open();
        },

        onUpdateLeaveType: function () {
          var oContext = this.getView()
            .getModel("view")
            .getProperty("/selectedLeaveType");
          var oUpdatedData = {
            name: sap.ui.core.Fragment.byId(
              "editLeaveTypeDialog",
              "editLeaveTypeNameInput"
            ).getValue(),
            maxDays:
              parseInt(
                sap.ui.core.Fragment.byId(
                  "editLeaveTypeDialog",
                  "editMaxDaysInput"
                ).getValue()
              ) || 0,
          };

          // Validation
          if (!oUpdatedData.name || !oUpdatedData.maxDays) {
            MessageToast.show("Please fill all required fields");
            return;
          }

          if (oUpdatedData.maxDays <= 0) {
            MessageToast.show("Maximum days must be greater than 0");
            return;
          }

          // Update the context
          oContext.setProperty("name", oUpdatedData.name);
          oContext.setProperty("maxDays", oUpdatedData.maxDays);

          oContext
            .getModel()
            .submitBatch(oContext.getModel().getUpdateGroupId())
            .then(
              function () {
                MessageToast.show("Leave type updated successfully");
                this.onCancelEditLeaveType();
                this._refreshTable();
              }.bind(this)
            )
            .catch(function (oError) {
              MessageToast.show("Error updating leave type: " + oError.message);
            });
        },

        onCancelEditLeaveType: function () {
          this._oEditLeaveTypeDialog.close();
        },

        _refreshTable: function () {
          var oTable = this.byId("leaveTypesTable");
          oTable.getBinding("items").refresh();
        },

        onRefresh: function () {
          this._refreshTable();
          MessageToast.show("Leave types data refreshed");
        },

        onSearch: function (oEvent) {
          var sQuery = oEvent.getParameter("newValue");
          var oTable = this.byId("leaveTypesTable");
          var oBinding = oTable.getBinding("items");

          if (sQuery) {
            var aFilters = [
              new sap.ui.model.Filter(
                "code",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "name",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
            ];
            var oCombinedFilter = new sap.ui.model.Filter(aFilters, false);
            oBinding.filter(oCombinedFilter);
          } else {
            oBinding.filter([]);
          }
        },
      }
    );
  }
);
