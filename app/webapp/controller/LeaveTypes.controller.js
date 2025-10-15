sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
  ],
  function (Controller, JSONModel, MessageToast, MessageBox, Fragment) {
    "use strict";

    return Controller.extend(
      "com.company.leavemanagement.controller.LeaveTypes",
      {
        onInit: function () {
          console.log("LeaveTypes controller initialized");
          this._initializeLocalModel();
          this._loadLeaveTypeCount();
          this._pLeaveTypeDialog = null;
          this._oCurrentContext = null;

          const oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("leaveTypes")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          console.log("Leave Types route matched");
          this._loadLeaveTypeCount();
        },

        _initializeLocalModel: function () {
          const oLocalModel = new JSONModel({
            totalCount: 0,
          });
          this.getView().setModel(oLocalModel, "local");
        },

        _loadLeaveTypeCount: function () {
          const oModel = this.getView().getModel();
          if (!oModel) {
            setTimeout(() => this._loadLeaveTypeCount(), 500);
            return;
          }

          oModel
            .bindList("/LeaveTypes")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const oLocalModel = this.getView().getModel("local");
              oLocalModel.setProperty("/totalCount", aContexts.length);
              console.log(`Loaded ${aContexts.length} leave types`);
            })
            .catch((error) => {
              console.error("Failed to load leave type count:", error);
            });
        },

        _refreshTable: function () {
          console.log("Refreshing leave types table...");
          const oTable = this.byId("leaveTypesTable");
          const oBinding = oTable.getBinding("items");

          if (oBinding) {
            oBinding.refresh();
            console.log("✅ Table binding refreshed");
          }

          // Also refresh the count
          this._loadLeaveTypeCount();
        },

        onNavBack: function () {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("home");
        },

        onRefresh: function () {
          console.log("Refresh button pressed");
          const oModel = this.getView().getModel();
          oModel.refresh();
          this._refreshTable();
          MessageToast.show("Leave types refreshed");
        },

        onAddLeaveType: function () {
          console.log("Add leave type button pressed");
          this._openLeaveTypeDialog(true);
        },

        onEditLeaveType: function (oEvent) {
          console.log("Edit button pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("No binding context found");
            return;
          }

          const oLeaveType = oContext.getObject();
          console.log("Leave type to edit:", oLeaveType);
          this._oCurrentContext = oContext;
          this._openLeaveTypeDialog(false, oLeaveType);
        },

        _openLeaveTypeDialog: function (bIsNew, oLeaveType) {
          const oDialogModel = new JSONModel({
            title: bIsNew ? "Add Leave Type" : "Edit Leave Type",
            code: oLeaveType ? oLeaveType.code : "",
            name: oLeaveType ? oLeaveType.name : "",
            maxDays: oLeaveType ? oLeaveType.maxDays : "",
            isNew: bIsNew,
            buttonText: bIsNew ? "Add" : "Update",
            showValidation: false,
            validationMessage: "",
          });

          this.getView().setModel(oDialogModel, "leaveTypeDialog");

          if (!this._pLeaveTypeDialog) {
            this._pLeaveTypeDialog = Fragment.load({
              id: this.getView().getId(),
              name: "com.company.leavemanagement.fragment.LeaveTypeDialog",
              controller: this,
            }).then((oDialog) => {
              this.getView().addDependent(oDialog);
              return oDialog;
            });
          }

          this._pLeaveTypeDialog.then((oDialog) => {
            oDialog.open();
          });
        },

        onLeaveTypeDialogConfirm: function () {
          const oDialogModel = this.getView().getModel("leaveTypeDialog");
          const oData = oDialogModel.getData();

          // Validation
          if (!oData.code || oData.code.trim() === "") {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty("/validationMessage", "Code is required");
            return;
          }

          // Validate code length (max 15 characters)
          if (oData.code.trim().length > 15) {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty(
              "/validationMessage",
              "Code must be 15 characters or less"
            );
            return;
          }

          if (!oData.name || oData.name.trim() === "") {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty("/validationMessage", "Name is required");
            return;
          }

          // Validate name length (max 40 characters)
          if (oData.name.trim().length > 40) {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty(
              "/validationMessage",
              "Name must be 40 characters or less"
            );
            return;
          }

          if (!oData.maxDays || oData.maxDays <= 0) {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty(
              "/validationMessage",
              "Maximum days must be greater than 0"
            );
            return;
          }

          // Close dialog
          this._pLeaveTypeDialog.then((oDialog) => {
            oDialog.close();
          });

          // Create or update
          if (oData.isNew) {
            this._createLeaveType(oData);
          } else {
            this._updateLeaveType(oData);
          }
        },

        onLeaveTypeDialogCancel: function () {
          this._pLeaveTypeDialog.then((oDialog) => {
            oDialog.close();
          });
        },

        onLeaveTypeDialogClose: function () {
          const oDialogModel = this.getView().getModel("leaveTypeDialog");
          if (oDialogModel) {
            oDialogModel.setProperty("/showValidation", false);
          }
          this._oCurrentContext = null;
        },

        _createLeaveType: function (oData) {
          console.log("Creating new leave type:", oData);

          const oModel = this.getView().getModel();

          // Trim and prepare data
          const oLeaveTypeData = {
            code: oData.code.toUpperCase().trim(),
            name: oData.name.trim(),
            maxDays: parseInt(oData.maxDays),
          };

          console.log("Prepared leave type data:", oLeaveTypeData);

          try {
            const oListBinding = oModel.bindList("/LeaveTypes");
            const oContext = oListBinding.create(oLeaveTypeData);

            console.log("Leave type context created, submitting batch...");

            oModel
              .submitBatch(oModel.getUpdateGroupId())
              .then(() => {
                console.log("Batch submitted, waiting for creation...");
                return oContext.created();
              })
              .then(() => {
                console.log("✅ Leave type created successfully");
                MessageToast.show("Leave type created successfully!");

                // Immediately refresh the table
                this._refreshTable();
              })
              .catch((error) => {
                console.error("❌ Creation failed:", error);
                let errorMessage = "Failed to create leave type";

                if (error.message) {
                  errorMessage += ": " + error.message;
                }

                MessageBox.error(errorMessage);
              });
          } catch (error) {
            console.error("❌ Exception:", error);
            MessageBox.error("Exception: " + error.message);
          }
        },

        _updateLeaveType: function (oData) {
          console.log("Updating leave type:", oData);

          if (!this._oCurrentContext) {
            console.error("No context found");
            return;
          }

          try {
            this._oCurrentContext.setProperty("name", oData.name.trim());
            this._oCurrentContext.setProperty(
              "maxDays",
              parseInt(oData.maxDays)
            );

            const oModel = this.getView().getModel();
            oModel
              .submitBatch(oModel.getUpdateGroupId())
              .then(() => {
                console.log("✅ Leave type updated successfully");
                MessageToast.show("Leave type updated successfully!");

                // Immediately refresh the table
                this._refreshTable();
              })
              .catch((error) => {
                console.error("❌ Update failed:", error);
                MessageBox.error(
                  "Failed to update leave type: " + error.message
                );
              });
          } catch (error) {
            console.error("❌ Exception:", error);
            MessageBox.error("Exception: " + error.message);
          }
        },

        onDeleteLeaveType: function (oEvent) {
          console.log("Delete button pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("No binding context found");
            return;
          }

          const oLeaveType = oContext.getObject();

          MessageBox.confirm(
            `Are you sure you want to delete the leave type "${oLeaveType.name}"?\n\n` +
              `This action cannot be undone.`,
            {
              title: "Confirm Deletion",
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  this._deleteLeaveType(oContext);
                }
              },
            }
          );
        },

        _deleteLeaveType: function (oContext) {
          console.log("Deleting leave type");
          oContext
            .delete()
            .then(() => {
              MessageToast.show("Leave type deleted successfully");

              // Immediately refresh the table
              this._refreshTable();
            })
            .catch((error) => {
              console.error("Delete failed:", error);
              MessageBox.error("Failed to delete leave type: " + error.message);
            });
        },

        onLeaveTypePress: function (oEvent) {
          console.log("Leave type row pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("No binding context found");
            return;
          }

          const oLeaveType = oContext.getObject();

          MessageBox.information(
            `Leave Type Details:\n\n` +
              `Code: ${oLeaveType.code}\n` +
              `Name: ${oLeaveType.name}\n` +
              `Maximum Days: ${oLeaveType.maxDays}\n\n` +
              `This leave type can be used by employees for leave requests.`,
            {
              title: "Leave Type Information",
            }
          );
        },
      }
    );
  }
);
