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
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
    Sorter,
    Fragment,
    Spreadsheet,
    exportLibrary
  ) {
    "use strict";

    const EdmType = exportLibrary.EdmType;

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
          console.log("🔍 Employee List route matched");
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
          console.log("➕ Add Employee button pressed");
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
          console.log("🔧 Opening dialog. Edit mode:", bEdit);

          if (!this._oEmployeeDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.company.leavemanagement.fragment.EmployeeDialog",
              controller: this,
            })
              .then((oDialog) => {
                this._oEmployeeDialog = oDialog;
                this.getView().addDependent(oDialog);
                console.log("✅ Dialog fragment loaded");
                this._showEmployeeDialog(bEdit, oContext);
              })
              .catch((error) => {
                console.error("❌ Failed to load dialog fragment:", error);
                MessageBox.error("Failed to open dialog: " + error.message);
              });
          } else {
            this._showEmployeeDialog(bEdit, oContext);
          }
        },

        _showEmployeeDialog: function (bEdit, oContext) {
          console.log(
            "📋 Showing dialog with mode:",
            bEdit ? "Edit" : "Create"
          );

          const oEmployee = bEdit
            ? Object.assign({}, oContext.getObject())
            : {
                empId: "",
                name: "",
                email: "",
                managerId: null, // Initialize as null instead of empty string
                leaveBalance: 20,
              };

          const oDialogModel = new JSONModel({
            editMode: bEdit,
            title: bEdit ? "Edit Employee" : "Add New Employee",
            employee: oEmployee,
          });

          this._oEmployeeDialog.setModel(oDialogModel, "dialog");

          if (bEdit) {
            this._editContext = oContext;
          } else {
            this._editContext = null;
          }

          this._oEmployeeDialog.open();

          console.log("✅ Dialog opened successfully");
          console.log("📝 Initial employee data:", oEmployee);
        },

        onSaveEmployee: function () {
          console.log("💾 Saving employee...");

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
            console.log("📝 Updating employee:", oEmployee.empId);
            this._updateEmployee(oEmployee);
          } else {
            // Create new employee
            console.log("➕ Creating new employee:", oEmployee.empId);
            this._createEmployee(oEmployee, oModel);
          }
        },

        _updateEmployee: function (oEmployee) {
          const oContext = this._editContext;
          const oModel = this.getView().getModel();

          oContext.setProperty("name", oEmployee.name);
          oContext.setProperty("email", oEmployee.email);
          oContext.setProperty(
            "leaveBalance",
            parseInt(oEmployee.leaveBalance)
          );

          if (oEmployee.managerId) {
            oContext.setProperty("managerId", parseInt(oEmployee.managerId));
          }

          oModel
            .submitBatch("updateGroup")
            .then(() => {
              MessageToast.show("Employee updated successfully");
              this._closeEmployeeDialog();
              this._loadStatistics();
              console.log("✅ Employee updated");
            })
            .catch((error) => {
              console.error("❌ Update failed:", error);
              MessageBox.error("Failed to update employee: " + error.message);
            });
        },

        _createEmployee: function (oEmployee, oModel) {
          // Prepare employee data
          const newEmployee = {
            empId: oEmployee.empId,
            name: oEmployee.name,
            email: oEmployee.email,
            leaveBalance: parseInt(oEmployee.leaveBalance) || 20,
          };

          // Add manager if selected and not empty
          console.log("🔍 Checking managerId:", oEmployee.managerId);
          console.log("🔍 Manager type:", typeof oEmployee.managerId);

          if (
            oEmployee.managerId &&
            oEmployee.managerId !== "" &&
            oEmployee.managerId !== "undefined" &&
            oEmployee.managerId !== null
          ) {
            newEmployee.managerId = oEmployee.managerId;
            console.log(
              "✅ Including managerId in request:",
              newEmployee.managerId
            );
          } else {
            console.log("⚠️ No manager selected, skipping managerId");
          }

          console.log(
            "📤 Final employee data to send:",
            JSON.stringify(newEmployee, null, 2)
          );

          // Use direct AJAX call
          const sServiceUrl = oModel.sServiceUrl || "/leave/";
          const sUrl = sServiceUrl + "Employees";

          console.log("🌐 Making direct POST to:", sUrl);

          // Use jQuery to make direct AJAX call
          $.ajax({
            url: sUrl,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(newEmployee),
            success: (data) => {
              console.log("✅ Employee created successfully via AJAX:", data);
              MessageToast.show("Employee created successfully");
              this._closeEmployeeDialog();

              // Refresh the table
              const oListBinding = oModel.bindList("/Employees");
              oListBinding.refresh();
              this._loadStatistics();
            },
            error: (xhr, status, error) => {
              console.error("❌ Create failed via AJAX");
              console.error("❌ Status:", status);
              console.error("❌ Error:", error);
              console.error("❌ Response:", xhr.responseText);

              let errorMessage = "Failed to create employee";
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

        onCancelEmployee: function () {
          this._closeEmployeeDialog();
        },

        onManagerChange: function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          const sSelectedKey = oSelectedItem ? oSelectedItem.getKey() : "";

          console.log("👔 Manager selection changed");
          console.log("   Selected item:", oSelectedItem);
          console.log("   Selected key:", sSelectedKey);

          const oDialogModel = this._oEmployeeDialog.getModel("dialog");

          if (sSelectedKey && sSelectedKey !== "") {
            oDialogModel.setProperty("/employee/managerId", sSelectedKey);
            console.log("   ✅ Manager ID set to:", sSelectedKey);
          } else {
            oDialogModel.setProperty("/employee/managerId", null);
            console.log("   ⚠️ Manager cleared (set to null)");
          }

          // Log current employee object
          console.log(
            "   Current employee object:",
            oDialogModel.getProperty("/employee")
          );
        },

        _closeEmployeeDialog: function () {
          if (this._oEmployeeDialog) {
            this._oEmployeeDialog.close();
            this._editContext = null;
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
          console.log("📥 Exporting employees to Excel...");

          const oTable = this.byId("employeeTable");
          const oBinding = oTable.getBinding("items");

          if (!oBinding || oBinding.getLength() === 0) {
            MessageBox.warning("No data available to export");
            return;
          }

          oBinding
            .requestContexts(0, oBinding.getLength())
            .then((aContexts) => {
              const aEmployees = aContexts.map((ctx) => ctx.getObject());

              const aCols = [
                {
                  label: "Employee ID",
                  property: "empId",
                  type: EdmType.String,
                },
                {
                  label: "Name",
                  property: "name",
                  type: EdmType.String,
                },
                {
                  label: "Email",
                  property: "email",
                  type: EdmType.String,
                },
                {
                  label: "Manager",
                  property: ["manager", "name"],
                  type: EdmType.String,
                },
                {
                  label: "Leave Balance",
                  property: "leaveBalance",
                  type: EdmType.Number,
                },
                {
                  label: "Last Modified",
                  property: "modifiedAt",
                  type: EdmType.Date,
                },
              ];

              const oSettings = {
                workbook: {
                  columns: aCols,
                  context: {
                    sheetName: "Employees",
                  },
                },
                dataSource: aEmployees,
                fileName: `Employees_Export_${
                  new Date().toISOString().split("T")[0]
                }.xlsx`,
                worker: false,
              };

              const oSheet = new Spreadsheet(oSettings);
              oSheet
                .build()
                .then(() => {
                  MessageToast.show("Employee list exported successfully!");
                  console.log("✅ Export completed");
                })
                .catch((error) => {
                  console.error("❌ Export failed:", error);
                  MessageBox.error("Failed to export: " + error.message);
                })
                .finally(() => {
                  oSheet.destroy();
                });
            })
            .catch((error) => {
              console.error("❌ Failed to get employee data:", error);
              MessageBox.error("Failed to retrieve employee data for export");
            });
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
