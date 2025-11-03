sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
    Fragment
  ) {
    "use strict";

    return Controller.extend(
      "com.company.leavemanagement.controller.Managers",
      {
        onInit: function () {
          console.log("👔 Managers controller initialized");
          this._initializeLocalModel();
          this._loadStatistics();
          this._pManagerDialog = null;
          this._oCurrentContext = null;

          const oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("managers")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          console.log("🔍 Managers route matched");
          this._loadStatistics();
        },

        _initializeLocalModel: function () {
          const oLocalModel = new JSONModel({
            totalCount: 0,
            stats: {
              totalManagers: 0,
              employeesManaged: 0,
              pendingApprovals: 0,
            },
          });
          this.getView().setModel(oLocalModel, "local");
        },

        _loadStatistics: function () {
          const oModel = this.getView().getModel();
          if (!oModel) {
            setTimeout(() => this._loadStatistics(), 500);
            return;
          }

          console.log("📊 Loading manager statistics...");

          Promise.all([
            this._loadManagerCount(oModel),
            this._loadEmployeeCount(oModel),
            this._loadPendingApprovalCount(oModel),
          ])
            .then(() => {
              console.log("✅ Manager statistics loaded successfully");
            })
            .catch((error) => {
              console.error("❌ Failed to load statistics:", error);
            });
        },

        _loadManagerCount: function (oModel) {
          return oModel
            .bindList("/Managers")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const oLocalModel = this.getView().getModel("local");
              oLocalModel.setProperty("/totalCount", aContexts.length);
              oLocalModel.setProperty("/stats/totalManagers", aContexts.length);
              console.log(`📊 Found ${aContexts.length} managers`);
            })
            .catch((error) => {
              console.error("❌ Failed to load manager count:", error);
            });
        },

        _loadEmployeeCount: function (oModel) {
          return oModel
            .bindList("/Employees")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const oLocalModel = this.getView().getModel("local");
              oLocalModel.setProperty(
                "/stats/employeesManaged",
                aContexts.length
              );
              console.log(`📊 Found ${aContexts.length} employees`);
            })
            .catch((error) => {
              console.error("❌ Failed to load employee count:", error);
            });
        },

        _loadPendingApprovalCount: function (oModel) {
          return oModel
            .bindList("/LeaveRequests")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const pendingCount = aContexts.filter(
                (ctx) => ctx.getObject().status === "Pending"
              ).length;

              const oLocalModel = this.getView().getModel("local");
              oLocalModel.setProperty("/stats/pendingApprovals", pendingCount);
              console.log(`📊 Found ${pendingCount} pending approvals`);
            })
            .catch((error) => {
              console.error("❌ Failed to load pending approval count:", error);
            });
        },

        _refreshTable: function () {
          console.log("🔄 Refreshing managers table...");
          const oTable = this.byId("managersTable");
          const oBinding = oTable.getBinding("items");

          if (oBinding) {
            oBinding.refresh();
            console.log("✅ Table binding refreshed");
          }

          // Also refresh statistics
          this._loadStatistics();
        },

        onNavBack: function () {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("home");
        },

        onRefresh: function () {
          console.log("🔄 Refresh button pressed");
          const oModel = this.getView().getModel();
          oModel.refresh();
          this._refreshTable();
          MessageToast.show("Managers refreshed");
        },

        onSearch: function (oEvent) {
          console.log("🔍 Search triggered");
          const sQuery = oEvent.getParameter("query");
          this._applyFilters(sQuery);
        },

        onSearchLiveChange: function (oEvent) {
          const sQuery = oEvent.getParameter("newValue");
          this._applyFilters(sQuery);
        },

        _applyFilters: function (sSearchQuery) {
          const oTable = this.byId("managersTable");
          const oBinding = oTable.getBinding("items");

          if (!oBinding) {
            console.error("❌ Table binding not found");
            return;
          }

          let aFilters = [];

          if (sSearchQuery) {
            aFilters.push(
              new Filter({
                filters: [
                  new Filter("name", FilterOperator.Contains, sSearchQuery),
                  new Filter("email", FilterOperator.Contains, sSearchQuery),
                ],
                and: false,
              })
            );
          }

          oBinding.filter(aFilters);
          console.log("✅ Filters applied:", { search: sSearchQuery });
        },

        onAddManager: function () {
          console.log("➕ Add manager button pressed");
          this._openManagerDialog(true);
        },

        _openManagerDialog: function (bIsNew, oManager) {
          const oDialogModel = new JSONModel({
            title: bIsNew ? "Add Manager" : "Edit Manager",
            name: oManager ? oManager.name : "",
            email: oManager ? oManager.email : "",
            isNew: bIsNew,
            buttonText: bIsNew ? "Add" : "Update",
            showValidation: false,
            validationMessage: "",
          });

          this.getView().setModel(oDialogModel, "managerDialog");

          if (!this._pManagerDialog) {
            this._pManagerDialog = Fragment.load({
              id: this.getView().getId(),
              name: "com.company.leavemanagement.fragment.ManagerDialog",
              controller: this,
            }).then((oDialog) => {
              this.getView().addDependent(oDialog);
              return oDialog;
            });
          }

          this._pManagerDialog.then((oDialog) => {
            oDialog.open();
          });
        },

        onManagerDialogConfirm: function () {
          const oDialogModel = this.getView().getModel("managerDialog");
          const oData = oDialogModel.getData();

          // Validation
          if (!oData.name || oData.name.trim() === "") {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty("/validationMessage", "Name is required");
            return;
          }

          // Validate name length (max 100 characters)
          if (oData.name.trim().length > 100) {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty(
              "/validationMessage",
              "Name must be 100 characters or less"
            );
            return;
          }

          if (!oData.email || oData.email.trim() === "") {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty("/validationMessage", "Email is required");
            return;
          }

          // Validate email length (max 100 characters)
          if (oData.email.trim().length > 100) {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty(
              "/validationMessage",
              "Email must be 100 characters or less"
            );
            return;
          }

          // Simple email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(oData.email)) {
            oDialogModel.setProperty("/showValidation", true);
            oDialogModel.setProperty(
              "/validationMessage",
              "Please enter a valid email address"
            );
            return;
          }

          // Close dialog
          this._pManagerDialog.then((oDialog) => {
            oDialog.close();
          });

          // Create or update
          if (oData.isNew) {
            this._createManager(oData);
          } else {
            this._updateManager(oData);
          }
        },

        onManagerDialogCancel: function () {
          this._pManagerDialog.then((oDialog) => {
            oDialog.close();
          });
        },

        onManagerDialogClose: function () {
          const oDialogModel = this.getView().getModel("managerDialog");
          if (oDialogModel) {
            oDialogModel.setProperty("/showValidation", false);
          }
          this._oCurrentContext = null;
        },

        _createManager: function (oData) {
          console.log("➕ Creating new manager:", oData);

          const oModel = this.getView().getModel();

          // Trim and prepare data
          const oManagerData = {
            name: oData.name.trim(),
            email: oData.email.toLowerCase().trim(),
          };

          console.log("📤 Prepared manager data:", oManagerData);

          // Use direct AJAX call
          const sServiceUrl = oModel.sServiceUrl || "/leave/";
          const sUrl = sServiceUrl + "Managers";

          console.log("🌐 Making POST request to:", sUrl);

          $.ajax({
            url: sUrl,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(oManagerData),
            success: (data) => {
              console.log("✅ Manager created successfully:", data);
              MessageToast.show("Manager created successfully!");

              // Refresh the table
              this._refreshTable();
            },
            error: (xhr, status, error) => {
              console.error("❌ Create failed");
              console.error("❌ Status:", status);
              console.error("❌ Error:", error);
              console.error("❌ Response:", xhr.responseText);

              let errorMessage = "Failed to create manager";
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.error?.message || errorMessage;
              } catch (e) {
                errorMessage = xhr.responseText || errorMessage;
              }

              MessageBox.error(errorMessage);
            },
          });
        },

        _updateManager: function (oData) {
          console.log("📝 Updating manager:", oData);

          if (!this._oCurrentContext) {
            console.error("❌ No context found");
            return;
          }

          const oModel = this.getView().getModel();
          const sManagerUUID = this._oCurrentContext.getProperty("ID");

          console.log("📋 Manager UUID:", sManagerUUID);

          // Prepare update data
          const updateData = {
            name: oData.name.trim(),
            email: oData.email.toLowerCase().trim(),
          };

          console.log("📤 Update data:", JSON.stringify(updateData, null, 2));

          // Use direct AJAX for update (PATCH request)
          const sServiceUrl = oModel.sServiceUrl || "/leave/";
          const sUrl = `${sServiceUrl}Managers(${sManagerUUID})`;

          console.log("🌐 Making PATCH request to:", sUrl);

          $.ajax({
            url: sUrl,
            type: "PATCH",
            contentType: "application/json",
            data: JSON.stringify(updateData),
            success: (data) => {
              console.log("✅ Manager updated successfully:", data);
              MessageToast.show("Manager updated successfully!");

              // Refresh the table
              this._refreshTable();

              // Clear current context
              this._oCurrentContext = null;
            },
            error: (xhr, status, error) => {
              console.error("❌ Update failed");
              console.error("❌ Status:", status);
              console.error("❌ Error:", error);
              console.error("❌ Response:", xhr.responseText);

              let errorMessage = "Failed to update manager";
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.error?.message || errorMessage;
              } catch (e) {
                errorMessage = xhr.responseText || errorMessage;
              }

              MessageBox.error(errorMessage);
            },
          });
        },

        onViewManager: function (oEvent) {
          console.log("👁️ View button pressed");
          const oContext = oEvent.getSource().getBindingContext();
          this.onManagerPress({
            getSource: () => ({ getBindingContext: () => oContext }),
          });
        },

        onEditManager: function (oEvent) {
          console.log("✏️ Edit button pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("❌ No binding context found");
            return;
          }

          const oManager = oContext.getObject();
          console.log("📋 Manager to edit:", oManager);
          this._oCurrentContext = oContext;
          this._openManagerDialog(false, oManager);
        },

        onDeleteManager: function (oEvent) {
          console.log("🗑️ Delete button pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("❌ No binding context found");
            return;
          }

          const oManager = oContext.getObject();

          MessageBox.confirm(
            `Are you sure you want to delete manager "${oManager.name}"?\n\n` +
              `Warning: This may affect employees assigned to this manager.`,
            {
              title: "Confirm Deletion",
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  this._deleteManager(oContext, oManager);
                }
              },
            }
          );
        },

        _deleteManager: function (oContext, oManager) {
          console.log("🗑️ Deleting manager");

          const oModel = this.getView().getModel();
          const sManagerUUID = oContext.getProperty("ID");

          console.log("📋 Manager details:");
          console.log("   UUID:", sManagerUUID);
          console.log("   Name:", oManager.name);
          console.log("   Email:", oManager.email);

          // Use direct AJAX for delete (DELETE request)
          const sServiceUrl = oModel.sServiceUrl || "/leave/";
          const sUrl = `${sServiceUrl}Managers(${sManagerUUID})`;

          console.log("🌐 Making DELETE request to:", sUrl);

          $.ajax({
            url: sUrl,
            type: "DELETE",
            success: () => {
              console.log("✅ Manager deleted successfully");
              MessageToast.show("Manager deleted successfully");

              // Refresh the table
              this._refreshTable();
            },
            error: (xhr, status, error) => {
              console.error("❌ Delete failed");
              console.error("❌ Status:", status);
              console.error("❌ Error:", error);
              console.error("❌ Response:", xhr.responseText);

              let errorMessage = "Failed to delete manager";
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.error?.message || errorMessage;
              } catch (e) {
                errorMessage = xhr.responseText || errorMessage;
              }

              MessageBox.error(errorMessage);
            },
          });
        },

        onManagerPress: function (oEvent) {
          console.log("👆 Manager row pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("❌ No binding context found");
            return;
          }

          const oManager = oContext.getObject();
          const oModel = this.getView().getModel();

          oModel
            .bindList("/Employees", undefined, undefined, [
              new Filter("managerId", FilterOperator.EQ, oManager.ID),
            ])
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const employeeCount = aContexts.length;
              const employeeNames = aContexts
                .slice(0, 5)
                .map((ctx) => ctx.getObject().name)
                .join(", ");

              MessageBox.information(
                `Manager Details:\n\n` +
                  `Name: ${oManager.name}\n` +
                  `Email: ${oManager.email}\n\n` +
                  `Employees Managed: ${employeeCount}\n` +
                  (employeeCount > 0
                    ? `\nTeam Members:\n${employeeNames}${
                        employeeCount > 5 ? "..." : ""
                      }`
                    : ""),
                {
                  title: "Manager Information",
                }
              );
            })
            .catch((error) => {
              console.error("❌ Failed to load employees:", error);
              MessageBox.information(
                `Manager Details:\n\n` +
                  `Name: ${oManager.name}\n` +
                  `Email: ${oManager.email}`,
                {
                  title: "Manager Information",
                }
              );
            });
        },
      }
    );
  }
);
