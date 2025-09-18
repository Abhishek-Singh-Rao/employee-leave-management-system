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
      "com.company.leavemanagement.controller.Employees",
      {
        formatter: formatter,

        onInit: function () {
          this._initializeModels();
          this._loadEmployees();
        },

        _initializeModels: function () {
          var oViewModel = new JSONModel({
            busy: false,
            mode: "None",
            employees: [],
          });
          this.getView().setModel(oViewModel, "view");
        },

        _loadEmployees: function () {
          var that = this;
          var oModel = this.getView().getModel();
          var oViewModel = this.getView().getModel("view");

          oViewModel.setProperty("/busy", true);

          var oBinding = oModel.bindList("/Employees");
          oBinding
            .requestContexts()
            .then(function (aContexts) {
              var aEmployees = aContexts.map(function (oContext) {
                return oContext.getObject();
              });
              oViewModel.setProperty("/employees", aEmployees);
              oViewModel.setProperty("/busy", false);
            })
            .catch(function (oError) {
              MessageToast.show("Error loading employees: " + oError.message);
              oViewModel.setProperty("/busy", false);
            });
        },

        onAddEmployee: function () {
          if (!this._oAddEmployeeDialog) {
            this._oAddEmployeeDialog = sap.ui.xmlfragment(
              "com.company.leavemanagement.fragment.AddEmployeeDialog",
              this
            );
            this.getView().addDependent(this._oAddEmployeeDialog);
          }
          this._oAddEmployeeDialog.open();
        },

        onSaveEmployee: function () {
          var oModel = this.getView().getModel();
          var oData = {
            empId: sap.ui.getCore().byId("empIdInput").getValue(),
            name: sap.ui.getCore().byId("nameInput").getValue(),
            email: sap.ui.getCore().byId("emailInput").getValue(),
            leaveBalance:
              parseInt(sap.ui.getCore().byId("leaveBalanceInput").getValue()) ||
              20,
          };

          // Validation
          if (!oData.empId || !oData.name || !oData.email) {
            MessageToast.show("Please fill all required fields");
            return;
          }

          var oBinding = oModel.bindList("/Employees");
          var oContext = oBinding.create(oData);

          oContext
            .created()
            .then(
              function () {
                MessageToast.show("Employee created successfully");
                this._loadEmployees();
                this.onCancelAddEmployee();
              }.bind(this)
            )
            .catch(function (oError) {
              MessageToast.show("Error creating employee: " + oError.message);
            });
        },

        onCancelAddEmployee: function () {
          this._oAddEmployeeDialog.close();
          this._clearAddEmployeeForm();
        },

        _clearAddEmployeeForm: function () {
          sap.ui.getCore().byId("empIdInput").setValue("");
          sap.ui.getCore().byId("nameInput").setValue("");
          sap.ui.getCore().byId("emailInput").setValue("");
          sap.ui.getCore().byId("leaveBalanceInput").setValue("20");
        },

        onDeleteEmployee: function (oEvent) {
          var that = this;
          var oContext = oEvent.getSource().getBindingContext();
          var sEmployeeName = oContext.getProperty("name");

          MessageBox.confirm(
            "Are you sure you want to delete employee: " + sEmployeeName + "?",
            {
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  oContext
                    .delete()
                    .then(function () {
                      MessageToast.show("Employee deleted successfully");
                      that._loadEmployees();
                    })
                    .catch(function (oError) {
                      MessageToast.show(
                        "Error deleting employee: " + oError.message
                      );
                    });
                }
              },
            }
          );
        },

        onRefresh: function () {
          this._loadEmployees();
          MessageToast.show("Employee data refreshed");
        },

        onSearch: function (oEvent) {
          var sQuery = oEvent.getParameter("newValue");
          var oTable = this.byId("employeesTable");
          var oBinding = oTable.getBinding("items");

          if (sQuery) {
            var aFilters = [
              new sap.ui.model.Filter(
                "name",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "empId",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "email",
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
