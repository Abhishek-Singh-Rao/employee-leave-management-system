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
      "com.company.leavemanagement.controller.Approvals",
      {
        onInit: function () {
          console.log("=== Approvals controller initialized ===");
          this._initializeLocalModel();
          this._pApprovalDialog = null;
          this._oCurrentContext = null;

          // Set up routing
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("approvals")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          console.log("Approval Dashboard route matched");
          this._loadStatistics();
        },

        _initializeLocalModel: function () {
          const oLocalModel = new JSONModel({
            selectedManagerName: "",
            stats: {
              pendingCount: 0,
              approvedToday: 0,
              rejectedToday: 0,
              totalProcessed: 0,
            },
          });
          this.getView().setModel(oLocalModel, "local");
        },

        onManagerChange: function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          if (!oSelectedItem) return;

          const sManagerName = oSelectedItem.getKey();
          console.log("Manager selected:", sManagerName);

          const oLocalModel = this.getView().getModel("local");
          oLocalModel.setProperty("/selectedManagerName", sManagerName);

          MessageToast.show(`Viewing requests for manager: ${sManagerName}`);
          this._loadStatistics();
        },

        _loadStatistics: function () {
          const oModel = this.getView().getModel();
          if (!oModel) {
            setTimeout(() => this._loadStatistics(), 500);
            return;
          }

          console.log("Loading approval statistics...");

          Promise.all([
            this._loadPendingCount(oModel),
            this._loadApprovedTodayCount(oModel),
            this._loadRejectedTodayCount(oModel),
          ])
            .then(() => {
              console.log("Statistics loaded successfully");
            })
            .catch((error) => {
              console.error("Failed to load statistics:", error);
            });
        },

        _loadPendingCount: function (oModel) {
          return oModel
            .bindList("/LeaveRequests")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const pendingRequests = aContexts.filter(
                (ctx) => ctx.getObject().status === "Pending"
              );

              const oLocalModel = this.getView().getModel("local");
              oLocalModel.setProperty(
                "/stats/pendingCount",
                pendingRequests.length
              );

              console.log(`Found ${pendingRequests.length} pending requests`);
            })
            .catch((error) => {
              console.error("Failed to load pending count:", error);
            });
        },

        _loadApprovedTodayCount: function (oModel) {
          return oModel
            .bindList("/Approvals")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const today = new Date().toISOString().split("T")[0];

              const approvedToday = aContexts.filter((ctx) => {
                const approval = ctx.getObject();
                const approvalDate = approval.createdAt
                  ? approval.createdAt.split("T")[0]
                  : "";
                return (
                  approval.decision === "Approved" && approvalDate === today
                );
              }).length;

              const oLocalModel = this.getView().getModel("local");
              oLocalModel.setProperty("/stats/approvedToday", approvedToday);

              console.log(`Approved today: ${approvedToday}`);
            })
            .catch((error) => {
              console.error("Failed to load approved count:", error);
            });
        },

        _loadRejectedTodayCount: function (oModel) {
          return oModel
            .bindList("/Approvals")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const today = new Date().toISOString().split("T")[0];

              const rejectedToday = aContexts.filter((ctx) => {
                const approval = ctx.getObject();
                const approvalDate = approval.createdAt
                  ? approval.createdAt.split("T")[0]
                  : "";
                return (
                  approval.decision === "Rejected" && approvalDate === today
                );
              }).length;

              const totalProcessed = aContexts.length;

              const oLocalModel = this.getView().getModel("local");
              oLocalModel.setProperty("/stats/rejectedToday", rejectedToday);
              oLocalModel.setProperty("/stats/totalProcessed", totalProcessed);

              console.log(
                `Rejected today: ${rejectedToday}, Total processed: ${totalProcessed}`
              );
            })
            .catch((error) => {
              console.error("Failed to load rejected count:", error);
            });
        },

        // Navigation
        onNavBack: function () {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("home");
        },

        onRefresh: function () {
          console.log("Refresh button pressed");
          const oModel = this.getView().getModel();
          oModel.refresh();
          this._loadStatistics();
          MessageToast.show("Dashboard refreshed");
        },

        // Approval Actions
        onApproveRequest: function (oEvent) {
          console.log("=== Approve button pressed ===");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("No binding context found");
            return;
          }

          const oRequest = oContext.getObject();
          console.log("Request to approve:", oRequest);

          // Get selected manager
          const oLocalModel = this.getView().getModel("local");
          const sManagerName = oLocalModel.getProperty("/selectedManagerName");

          if (!sManagerName) {
            MessageBox.error("Please select a manager first");
            return;
          }

          // Open approval dialog with "Approved" (proper case)
          this._openApprovalDialog(oContext, "Approved", sManagerName);
        },

        onRejectRequest: function (oEvent) {
          console.log("=== Reject button pressed ===");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("No binding context found");
            return;
          }

          const oRequest = oContext.getObject();
          console.log("Request to reject:", oRequest);

          // Get selected manager
          const oLocalModel = this.getView().getModel("local");
          const sManagerName = oLocalModel.getProperty("/selectedManagerName");

          if (!sManagerName) {
            MessageBox.error("Please select a manager first");
            return;
          }

          // Open rejection dialog with "Rejected" (proper case)
          this._openApprovalDialog(oContext, "Rejected", sManagerName);
        },

        _openApprovalDialog: function (oContext, sDecision, sManagerName) {
          const oRequest = oContext.getObject();
          this._oCurrentContext = oContext;

          // Prepare dialog data
          const oDialogModel = new JSONModel({
            title:
              sDecision === "Approved"
                ? "Approve Leave Request"
                : "Reject Leave Request",
            decision: sDecision,
            managerName: sManagerName,
            employeeName: oRequest.employee?.name || "Unknown",
            leaveType: oRequest.leaveType?.name || "Unknown",
            period: `${this.formatDate(oRequest.startDate)} - ${this.formatDate(
              oRequest.endDate
            )}`,
            days: oRequest.days,
            balance: oRequest.employee?.leaveBalance || 0,
            comments: "",
            message:
              sDecision === "Approved"
                ? `Approving this request will deduct ${oRequest.days} days from the employee's balance.`
                : "Please provide a reason for rejection. This is required.",
            messageType: sDecision === "Approved" ? "Success" : "Warning",
            confirmText: sDecision === "Approved" ? "Approve" : "Reject",
            confirmType: sDecision === "Approved" ? "Accept" : "Reject",
            confirmIcon:
              sDecision === "Approved"
                ? "sap-icon://accept"
                : "sap-icon://decline",
          });

          this.getView().setModel(oDialogModel, "dialog");

          // Load and open dialog
          if (!this._pApprovalDialog) {
            this._pApprovalDialog = Fragment.load({
              id: this.getView().getId(),
              name: "com.company.leavemanagement.fragment.ApprovalDialog",
              controller: this,
            }).then((oDialog) => {
              this.getView().addDependent(oDialog);
              return oDialog;
            });
          }

          this._pApprovalDialog.then((oDialog) => {
            oDialog.open();
          });
        },

        onDialogConfirm: function () {
          const oDialogModel = this.getView().getModel("dialog");
          const sDecision = oDialogModel.getProperty("/decision");
          const sComments = oDialogModel.getProperty("/comments");
          const sManagerName = oDialogModel.getProperty("/managerName");

          // Validate comments for rejection
          if (
            sDecision === "Rejected" &&
            (!sComments || sComments.trim() === "")
          ) {
            MessageBox.error("Comments are required when rejecting a request");
            return;
          }

          // Close dialog
          this._pApprovalDialog.then((oDialog) => {
            oDialog.close();
          });

          // Create approval
          this._createApproval(
            this._oCurrentContext,
            sDecision,
            sManagerName,
            sComments
          );
        },

        onDialogCancel: function () {
          this._pApprovalDialog.then((oDialog) => {
            oDialog.close();
          });
        },

        onDialogClose: function () {
          // Reset dialog model
          this.getView().getModel("dialog").setProperty("/comments", "");
        },

        _createApproval: function (
          oContext,
          sDecision,
          sManagerName,
          sComments
        ) {
          const oRequest = oContext.getObject();

          console.log("=== Creating approval record ===");
          console.log("Decision:", sDecision);
          console.log("Manager:", sManagerName);
          console.log("Comments:", sComments);
          console.log("Request ID:", oRequest.ID);

          const oModel = this.getView().getModel();

          // Prepare approval data matching the schema
          const oApprovalData = {
            request_ID: oRequest.ID,
            employeeId: oRequest.employeeId,
            managerName: sManagerName,
            decision: sDecision,
            comments: sComments || "",
          };

          console.log("Approval data to submit:", oApprovalData);

          try {
            // Create the approval using OData V4
            const oListBinding = oModel.bindList("/Approvals");
            const oApprovalContext = oListBinding.create(oApprovalData);

            console.log("Approval context created, submitting batch...");

            // Submit the batch
            oModel
              .submitBatch(oModel.getUpdateGroupId())
              .then(() => {
                console.log("Batch submitted, waiting for creation...");
                return oApprovalContext.created();
              })
              .then(() => {
                console.log("=== SUCCESS: Approval created ===");

                const sMessage =
                  sDecision === "Approved"
                    ? `Leave request approved successfully!\n\nEmployee balance has been updated.`
                    : `Leave request rejected.`;

                MessageBox.success(sMessage, {
                  title: "Success",
                  onClose: () => {
                    // Refresh the view
                    this.onRefresh();
                  },
                });
              })
              .catch((error) => {
                console.error("=== ERROR: Approval creation failed ===");
                console.error("Error:", error);
                console.error("Error message:", error.message);

                let errorMessage = "Failed to process approval";
                if (error.error && error.error.message) {
                  errorMessage = error.error.message;
                } else if (error.message) {
                  errorMessage = error.message;
                }

                MessageBox.error("Approval Error: " + errorMessage);
              });
          } catch (error) {
            console.error("=== EXCEPTION during approval creation ===");
            console.error("Exception:", error);
            MessageBox.error("Exception: " + error.message);
          }
        },

        // Formatters
        formatDate: function (sDate) {
          if (!sDate) return "";
          const oDate = new Date(sDate);
          const options = { year: "numeric", month: "short", day: "numeric" };
          return oDate.toLocaleDateString("en-US", options);
        },

        formatDateTime: function (sDateTime) {
          if (!sDateTime) return "";
          const oDate = new Date(sDateTime);
          const dateOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
          };
          const timeOptions = { hour: "2-digit", minute: "2-digit" };
          return (
            oDate.toLocaleDateString("en-US", dateOptions) +
            " " +
            oDate.toLocaleTimeString("en-US", timeOptions)
          );
        },
      }
    );
  }
);
