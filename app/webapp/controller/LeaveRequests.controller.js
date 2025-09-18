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
      "com.company.leavemanagement.controller.LeaveRequests",
      {
        formatter: formatter,

        onInit: function () {
          this._initializeModels();
          this._loadData();
        },

        _initializeModels: function () {
          var oViewModel = new JSONModel({
            busy: false,
            employees: [],
            leaveTypes: [],
            selectedRequest: null,
          });
          this.getView().setModel(oViewModel, "view");
        },

        _loadData: function () {
          this._loadEmployees();
          this._loadLeaveTypes();
        },

        _loadEmployees: function () {
          var oModel = this.getView().getModel();
          var oViewModel = this.getView().getModel("view");

          var oBinding = oModel.bindList("/Employees");
          oBinding.requestContexts().then(function (aContexts) {
            var aEmployees = aContexts.map(function (oContext) {
              return oContext.getObject();
            });
            oViewModel.setProperty("/employees", aEmployees);
          });
        },

        _loadLeaveTypes: function () {
          var oModel = this.getView().getModel();
          var oViewModel = this.getView().getModel("view");

          var oBinding = oModel.bindList("/LeaveTypes");
          oBinding.requestContexts().then(function (aContexts) {
            var aLeaveTypes = aContexts.map(function (oContext) {
              return oContext.getObject();
            });
            oViewModel.setProperty("/leaveTypes", aLeaveTypes);
          });
        },

        onAddRequest: function () {
          if (!this._oAddRequestDialog) {
            this._oAddRequestDialog = sap.ui.xmlfragment(
              "com.company.leavemanagement.fragment.AddLeaveRequestDialog",
              this
            );
            this.getView().addDependent(this._oAddRequestDialog);
          }
          this._populateDialogData();
          this._oAddRequestDialog.open();
        },

        _populateDialogData: function () {
          var oViewModel = this.getView().getModel("view");
          var aEmployees = oViewModel.getProperty("/employees");
          var aLeaveTypes = oViewModel.getProperty("/leaveTypes");

          // Populate employee select
          var oEmployeeSelect = sap.ui.getCore().byId("employeeSelect");
          oEmployeeSelect.removeAllItems();
          aEmployees.forEach(function (oEmployee) {
            oEmployeeSelect.addItem(
              new sap.ui.core.Item({
                key: oEmployee.empId,
                text: oEmployee.name + " (" + oEmployee.empId + ")",
              })
            );
          });

          // Populate leave type select
          var oLeaveTypeSelect = sap.ui.getCore().byId("leaveTypeSelect");
          oLeaveTypeSelect.removeAllItems();
          aLeaveTypes.forEach(function (oLeaveType) {
            oLeaveTypeSelect.addItem(
              new sap.ui.core.Item({
                key: oLeaveType.code,
                text:
                  oLeaveType.name + " (Max: " + oLeaveType.maxDays + " days)",
              })
            );
          });
        },

        onSaveRequest: function () {
          var oModel = this.getView().getModel();

          var sEmployeeId = sap.ui
            .getCore()
            .byId("employeeSelect")
            .getSelectedKey();
          var sLeaveTypeCode = sap.ui
            .getCore()
            .byId("leaveTypeSelect")
            .getSelectedKey();
          var dStartDate = sap.ui
            .getCore()
            .byId("startDatePicker")
            .getDateValue();
          var dEndDate = sap.ui.getCore().byId("endDatePicker").getDateValue();
          var sReason = sap.ui.getCore().byId("reasonTextArea").getValue();

          // Validation
          if (!sEmployeeId || !sLeaveTypeCode || !dStartDate || !dEndDate) {
            MessageToast.show("Please fill all required fields");
            return;
          }

          if (dStartDate > dEndDate) {
            MessageToast.show("Start date must be before end date");
            return;
          }

          // Calculate days
          var iDays =
            Math.ceil((dEndDate - dStartDate) / (1000 * 60 * 60 * 24)) + 1;

          var oData = {
            employee_empId: sEmployeeId,
            leaveType_code: sLeaveTypeCode,
            startDate: dStartDate.toISOString().split("T")[0],
            endDate: dEndDate.toISOString().split("T")[0],
            days: iDays,
            reason: sReason,
            status: "Pending",
          };

          var oBinding = oModel.bindList("/LeaveRequests");
          var oContext = oBinding.create(oData);

          oContext
            .created()
            .then(
              function () {
                MessageToast.show("Leave request submitted successfully");
                this.onCancelAddRequest();
                this._refreshTable();
              }.bind(this)
            )
            .catch(function (oError) {
              MessageToast.show(
                "Error creating leave request: " + oError.message
              );
            });
        },

        onCancelAddRequest: function () {
          this._oAddRequestDialog.close();
          this._clearAddRequestForm();
        },

        _clearAddRequestForm: function () {
          sap.ui.getCore().byId("employeeSelect").setSelectedKey("");
          sap.ui.getCore().byId("leaveTypeSelect").setSelectedKey("");
          sap.ui.getCore().byId("startDatePicker").setValue("");
          sap.ui.getCore().byId("endDatePicker").setValue("");
          sap.ui.getCore().byId("reasonTextArea").setValue("");
        },

        _refreshTable: function () {
          var oTable = this.byId("leaveRequestsTable");
          oTable.getBinding("items").refresh();
        },

        onApproveRequest: function (oEvent) {
          this._handleApproval(oEvent, "APPROVED");
        },

        onRejectRequest: function (oEvent) {
          this._handleApproval(oEvent, "REJECTED");
        },

        _handleApproval: function (oEvent, sDecision) {
          var that = this;
          var oContext = oEvent.getSource().getBindingContext();
          var oRequestData = oContext.getObject();
          var sAction = sDecision === "APPROVED" ? "approve" : "reject";

          MessageBox.confirm(
            "Are you sure you want to " + sAction + " this request?",
            {
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  that._createApproval(oRequestData, sDecision);
                }
              },
            }
          );
        },

        _createApproval: function (oRequestData, sDecision) {
          var oModel = this.getView().getModel();

          var oApprovalData = {
            employeeId: oRequestData.employee_empId,
            managerName: "System Manager", // In real scenario, get from logged in user
            decision: sDecision,
            comments:
              sDecision === "APPROVED"
                ? "Request approved"
                : "Request rejected",
            request_ID: oRequestData.ID,
          };

          var oBinding = oModel.bindList("/Approvals");
          var oContext = oBinding.create(oApprovalData);

          oContext
            .created()
            .then(
              function () {
                MessageToast.show(
                  "Request " + sDecision.toLowerCase() + " successfully"
                );
                this._refreshTable();
              }.bind(this)
            )
            .catch(function (oError) {
              MessageToast.show("Error processing approval: " + oError.message);
            });
        },

        onRefresh: function () {
          this._refreshTable();
          MessageToast.show("Leave requests refreshed");
        },

        onSearch: function (oEvent) {
          var sQuery = oEvent.getParameter("newValue");
          var oTable = this.byId("leaveRequestsTable");
          var oBinding = oTable.getBinding("items");

          if (sQuery) {
            var aFilters = [
              new sap.ui.model.Filter(
                "employee_empId",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "reason",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "status",
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

        onFilterByStatus: function (oEvent) {
          var sStatus = oEvent.getParameter("selectedItem").getKey();
          var oTable = this.byId("leaveRequestsTable");
          var oBinding = oTable.getBinding("items");

          if (sStatus && sStatus !== "All") {
            var oFilter = new sap.ui.model.Filter(
              "status",
              sap.ui.model.FilterOperator.EQ,
              sStatus
            );
            oBinding.filter([oFilter]);
          } else {
            oBinding.filter([]);
          }
        },
      }
    );
  }
);
