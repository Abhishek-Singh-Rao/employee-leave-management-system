sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/Fragment",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
    Sorter,
    Fragment
  ) {
    "use strict";

    return Controller.extend(
      "com.company.leavemanagement.controller.EmployeeList",
      {
        onInit: function () {
          console.log("👥 EmployeeList controller initialized");
          this._initializeLocalModel();
          this._loadStatistics();

          // Set up routing
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("employeeList")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          console.log("📍 Employee List route matched");
          this.onRefresh();
        },

        _initializeLocalModel: function () {
          const oLocalModel = new JSONModel({
            stats: {
              totalEmployees: 0,
              avgLeaveBalance: 0,
              lowBalanceCount: 0,
              managersCount: 0,
            },
            searchQuery: "",
            selectedManager: "",
          });
          this.getView().setModel(oLocalModel, "local");
        },

        _loadStatistics: function () {
          const oModel = this.getView().getModel();
          if (!oModel) {
            setTimeout(() => this._loadStatistics(), 500);
            return;
          }

          Promise.all([
            oModel.bindList("/Employees").requestContexts(0, 1000),
            oModel.bindList("/Managers").requestContexts(0, 100),
          ])
            .then(([employeeContexts, managerContexts]) => {
              const employees = employeeContexts.map((ctx) => ctx.getObject());
              const oLocalModel = this.getView().getModel("local");

              // Calculate statistics
              const totalEmployees = employees.length;
              const totalLeaveBalance = employees.reduce(
                (sum, emp) => sum + (emp.leaveBalance || 0),
                0
              );
              const avgLeaveBalance =
                totalEmployees > 0
                  ? Math.round(totalLeaveBalance / totalEmployees)
                  : 0;
              const lowBalanceCount = employees.filter(
                (emp) => (emp.leaveBalance || 0) < 5
              ).length;
              const managersCount = managerContexts.length;

              oLocalModel.setProperty("/stats", {
                totalEmployees,
                avgLeaveBalance,
                lowBalanceCount,
                managersCount,
              });

              console.log("📊 Employee statistics loaded:", {
                totalEmployees,
                avgLeaveBalance,
                lowBalanceCount,
                managersCount,
              });
            })
            .catch((error) => {
              console.error("❌ Failed to load statistics:", error);
            });
        },

        // Navigation
        onNavBack: function () {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("home");
        },

        // CRUD Operations
        onAddEmployee: function () {
          this._openEmployeeDialog();
        },

        onEditEmployee: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext();
          this._openEmployeeDialog(oContext);
        },

        onDeleteEmployee: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext();
          const oEmployee = oContext.getObject();

          MessageBox.confirm(
            `Are you sure you want to delete employee ${oEmployee.name} (${oEmployee.empId})?`,
            {
              title: "Delete Employee",
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  this._deleteEmployee(oContext);
                }
              },
            }
          );
        },

        _deleteEmployee: function (oContext) {
          oContext
            .delete()
            .then(() => {
              MessageToast.show("Employee deleted successfully");
              this._loadStatistics();
            })
            .catch((error) => {
              console.error("❌ Delete failed:", error);
              MessageBox.error("Failed to delete employee: " + error.message);
            });
        },

        _openEmployeeDialog: function (oContext) {
          const bEdit = !!oContext;

          if (!this._oEmployeeDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.company.leavemanagement.fragment.EmployeeDialog",
              controller: this,
            }).then((oDialog) => {
              this._oEmployeeDialog = oDialog;
              this.getView().addDependent(oDialog);
              this._showEmployeeDialog(bEdit, oContext);
            });
          } else {
            this._showEmployeeDialog(bEdit, oContext);
          }
        },

        _showEmployeeDialog: function (bEdit, oContext) {
          const oDialogModel = new JSONModel({
            editMode: bEdit,
            title: bEdit ? "Edit Employee" : "Add New Employee",
            employee: bEdit
              ? Object.assign({}, oContext.getObject())
              : {
                  empId: "",
                  name: "",
                  email: "",
                  managerId: "",
                  leaveBalance: 20,
                },
          });

          this._oEmployeeDialog.setModel(oDialogModel, "dialog");
          this._oEmployeeDialog.bindElement({
            path: bEdit ? oContext.getPath() : "/Employees",
            model: undefined,
          });

          this._oEmployeeDialog.open();
        },

        onSaveEmployee: function () {
          const oDialogModel = this._oEmployeeDialog.getModel("dialog");
          const oEmployee = oDialogModel.getProperty("/employee");
          const bEdit = oDialogModel.getProperty("/editMode");

          // Validation
          if (!oEmployee.empId || !oEmployee.name || !oEmployee.email) {
            MessageBox.error("Please fill in all required fields");
            return;
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(oEmployee.email)) {
            MessageBox.error("Please enter a valid email address");
            return;
          }

          const oModel = this.getView().getModel();

          if (bEdit) {
            // Update existing employee
            const sPath = this._oEmployeeDialog.getBindingContext().getPath();
            const oContext = oModel.bindContext(sPath);

            Object.keys(oEmployee).forEach((key) => {
              oContext.setProperty(key, oEmployee[key]);
            });

            oModel
              .submitBatch("updateGroup")
              .then(() => {
                MessageToast.show("Employee updated successfully");
                this._closeEmployeeDialog();
                this._loadStatistics();
              })
              .catch((error) => {
                console.error("❌ Update failed:", error);
                MessageBox.error("Failed to update employee: " + error.message);
              });
          } else {
            // Create new employee
            const oListBinding = oModel.bindList("/Employees");

            oListBinding
              .create(oEmployee)
              .then(() => {
                MessageToast.show("Employee created successfully");
                this._closeEmployeeDialog();
                this._loadStatistics();
              })
              .catch((error) => {
                console.error("❌ Create failed:", error);
                MessageBox.error("Failed to create employee: " + error.message);
              });
          }
        },

        onCancelEmployee: function () {
          this._closeEmployeeDialog();
        },

        _closeEmployeeDialog: function () {
          if (this._oEmployeeDialog) {
            this._oEmployeeDialog.close();
          }
        },

        // Search and Filter
        onSearch: function (oEvent) {
          const sQuery = oEvent.getParameter("query");
          this._applySearchFilter(sQuery);
        },

        onSearchLiveChange: function (oEvent) {
          const sQuery = oEvent.getParameter("newValue");
          this._applySearchFilter(sQuery);
        },

        _applySearchFilter: function (sQuery) {
          const oTable = this.byId("employeeTable");
          const oBinding = oTable.getBinding("items");

          let aFilters = [];

          if (sQuery) {
            aFilters.push(
              new Filter({
                filters: [
                  new Filter("empId", FilterOperator.Contains, sQuery),
                  new Filter("name", FilterOperator.Contains, sQuery),
                  new Filter("email", FilterOperator.Contains, sQuery),
                ],
                and: false,
              })
            );
          }

          // Apply manager filter if selected
          const sSelectedManager = this.getView()
            .getModel("local")
            .getProperty("/selectedManager");
          if (sSelectedManager) {
            aFilters.push(
              new Filter("manager/ID", FilterOperator.EQ, sSelectedManager)
            );
          }

          oBinding.filter(aFilters);
        },

        onManagerFilter: function (oEvent) {
          const sSelectedKey = oEvent.getParameter("selectedItem")?.getKey();
          this.getView()
            .getModel("local")
            .setProperty("/selectedManager", sSelectedKey || "");

          const sQuery = this.byId("searchField").getValue();
          this._applySearchFilter(sQuery);
        },

        onClearFilters: function () {
          this.byId("searchField").setValue("");
          this.byId("managerFilter").setSelectedKey("");
          this.getView().getModel("local").setProperty("/selectedManager", "");

          const oTable = this.byId("employeeTable");
          const oBinding = oTable.getBinding("items");
          oBinding.filter([]);
        },

        // Table actions
        onEmployeePress: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext();
          const sEmployeeId = oContext.getProperty("ID");

          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("employeeDetail", {
            employeeId: sEmployeeId,
          });
        },

        onRefresh: function () {
          const oModel = this.getView().getModel();
          oModel.refresh();
          this._loadStatistics();
          MessageToast.show("Employee list refreshed");
        },

        onExport: function () {
          MessageToast.show(
            "Export functionality will be implemented in the next phase"
          );
          // TODO: Implement Excel export using sap.ui.export library
        },

        // Formatters
        formatDate: function (sDate) {
          if (!sDate) return "";

          const oDate = new Date(sDate);
          return oDate.toLocaleDateString();
        },

        // Cleanup
        onExit: function () {
          if (this._oEmployeeDialog) {
            this._oEmployeeDialog.destroy();
          }
        },
      }
    );
  }
);
