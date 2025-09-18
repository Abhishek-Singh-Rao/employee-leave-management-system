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
      "com.company.leavemanagement.controller.Approvals",
      {
        formatter: formatter,

        onInit: function () {
          this._initializeModels();
        },

        _initializeModels: function () {
          var oViewModel = new JSONModel({
            busy: false,
            selectedApproval: null,
          });
          this.getView().setModel(oViewModel, "view");
        },

        onRefresh: function () {
          this._refreshTable();
          MessageToast.show("Approvals data refreshed");
        },

        _refreshTable: function () {
          var oTable = this.byId("approvalsTable");
          oTable.getBinding("items").refresh();
        },

        onSearch: function (oEvent) {
          var sQuery = oEvent.getParameter("newValue");
          var oTable = this.byId("approvalsTable");
          var oBinding = oTable.getBinding("items");

          if (sQuery) {
            var aFilters = [
              new sap.ui.model.Filter(
                "employeeId",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "managerName",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "decision",
                sap.ui.model.FilterOperator.Contains,
                sQuery
              ),
              new sap.ui.model.Filter(
                "comments",
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

        onFilterByDecision: function (oEvent) {
          var sDecision = oEvent.getParameter("selectedItem").getKey();
          var oTable = this.byId("approvalsTable");
          var oBinding = oTable.getBinding("items");

          if (sDecision && sDecision !== "All") {
            var oFilter = new sap.ui.model.Filter(
              "decision",
              sap.ui.model.FilterOperator.EQ,
              sDecision
            );
            oBinding.filter([oFilter]);
          } else {
            oBinding.filter([]);
          }
        },

        onExportToExcel: function () {
          var oTable = this.byId("approvalsTable");
          var aItems = oTable.getItems();

          if (aItems.length === 0) {
            MessageToast.show("No data to export");
            return;
          }

          // Simple export functionality - in real scenario, use sap.ui.export library
          MessageToast.show("Export functionality would be implemented here");
        },

        onApprovalDetails: function (oEvent) {
          var oContext = oEvent.getSource().getBindingContext();
          var oApprovalData = oContext.getObject();

          var sMessage =
            "Approval Details:\n\n" +
            "Employee ID: " +
            oApprovalData.employeeId +
            "\n" +
            "Manager: " +
            oApprovalData.managerName +
            "\n" +
            "Decision: " +
            oApprovalData.decision +
            "\n" +
            "Date: " +
            this.formatter.formatDate(oApprovalData.createdAt) +
            "\n" +
            "Comments: " +
            (oApprovalData.comments || "No comments");

          MessageBox.information(sMessage, {
            title: "Approval Details",
          });
        },
      }
    );
  }
);
