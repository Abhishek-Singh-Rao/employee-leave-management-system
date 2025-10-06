const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const { Employee, LeaveRequest, LeaveType, Approval } = this.entities;

  /** ----------- VALIDATE LEAVE REQUEST (Phase 3 - Keep Working) ----------- **/
  this.before("CREATE", "LeaveRequests", async (req) => {
    const { employeeId, leaveTypeCode, startDate, endDate } = req.data;

    console.log("Backend received leave request data:", req.data);

    if (new Date(startDate) > new Date(endDate)) {
      return req.error(400, "Start date must be before end date");
    }

    const employee = await SELECT.one
      .from("leave.Employee")
      .where({ empId: employeeId });
    if (!employee) {
      console.error(`Employee ${employeeId} not found`);
      return req.error(404, `Employee ${employeeId} not found`);
    }

    const leaveType = await SELECT.one
      .from("leave.LeaveType")
      .where({ code: leaveTypeCode });
    if (!leaveType) {
      console.error(`Leave type ${leaveTypeCode} not found`);
      return req.error(404, `Leave type ${leaveTypeCode} not found`);
    }

    const days =
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1;

    if (days > leaveType.maxDays) {
      return req.error(
        400,
        `Cannot request more than ${leaveType.maxDays} days for ${leaveType.name}`
      );
    }
    if (days > employee.leaveBalance) {
      return req.error(400, "Not enough leave balance");
    }

    console.log("Backend validation passed for leave request");
  });

  /** ----------- VALIDATE APPROVAL CREATION (Phase 4 - NEW) ----------- **/
  this.before("CREATE", "Approvals", async (req) => {
    const { request_ID, decision, managerName, comments } = req.data;

    console.log("=== Phase 4: Backend received approval data ===", req.data);

    // Validate required fields
    if (!request_ID) {
      console.error("Missing request_ID");
      return req.error(400, "Leave request ID is required");
    }

    if (!decision || (decision !== "Approved" && decision !== "Rejected")) {
      console.error("Invalid decision:", decision);
      return req.error(400, "Decision must be Approved or Rejected");
    }

    if (!managerName) {
      console.error("Missing managerName");
      return req.error(400, "Manager name is required");
    }

    // Validate manager exists
    const manager = await SELECT.one
      .from("leave.Manager")
      .where({ name: managerName });
    if (!manager) {
      console.error(`Manager ${managerName} not found`);
      return req.error(404, `Manager ${managerName} not found`);
    }

    // Check if leave request exists
    const leaveRequest = await SELECT.one
      .from("leave.LeaveRequest")
      .where({ ID: request_ID });

    if (!leaveRequest) {
      console.error(`Leave request ${request_ID} not found`);
      return req.error(404, "Leave request not found");
    }

    console.log("Found leave request:", leaveRequest);

    // Check if request is already processed
    if (leaveRequest.status !== "Pending") {
      console.error(`Request already ${leaveRequest.status}`);
      return req.error(
        400,
        `This request has already been ${leaveRequest.status.toLowerCase()}`
      );
    }

    // Require comments for rejection
    if (decision === "Rejected" && (!comments || comments.trim() === "")) {
      console.error("Missing comments for rejection");
      return req.error(400, "Comments are required when rejecting a request");
    }

    // Set employeeId from the leave request for the approval record
    req.data.employeeId = leaveRequest.employeeId;

    console.log("=== Phase 4: Approval validation passed ===");
  });

  /** ----------- UPDATE BALANCE AND STATUS AFTER APPROVAL (Phase 4 - NEW) ----------- **/
  this.after("CREATE", "Approvals", async (data, req) => {
    const { decision, request_ID, comments, managerName } = data;

    console.log("=== Phase 4: Processing approval after creation ===");
    console.log("Approval data:", { decision, request_ID, managerName });

    if (!request_ID) {
      console.error("No request_ID found in approval data");
      return;
    }

    try {
      // Get the leave request with employee details
      const request = await SELECT.one
        .from("leave.LeaveRequest")
        .where({ ID: request_ID });

      if (!request) {
        console.error(
          `Leave request ${request_ID} not found during processing`
        );
        return;
      }

      console.log("Processing leave request:", {
        ID: request.ID,
        employeeId: request.employeeId,
        days: request.days,
        status: request.status,
      });

      if (decision === "Approved") {
        console.log(`=== APPROVING REQUEST ${request_ID} ===`);

        // Calculate days
        const days =
          (new Date(request.endDate) - new Date(request.startDate)) /
            (1000 * 60 * 60 * 24) +
          1;

        console.log(
          `Deducting ${days} days from employee ${request.employeeId}`
        );

        // Get current employee balance
        const employee = await SELECT.one
          .from("leave.Employee")
          .where({ empId: request.employeeId });

        console.log(`Current balance: ${employee.leaveBalance} days`);

        // Update employee balance
        await UPDATE("leave.Employee")
          .set({ leaveBalance: { "-=": days } })
          .where({ empId: request.employeeId });

        console.log(`New balance: ${employee.leaveBalance - days} days`);

        // Update leave request status
        await UPDATE("leave.LeaveRequest")
          .set({ status: "Approved" })
          .where({ ID: request_ID });

        console.log(`✅ Leave request ${request_ID} APPROVED, balance updated`);
      } else if (decision === "Rejected") {
        console.log(`=== REJECTING REQUEST ${request_ID} ===`);

        // Update leave request status only (no balance change)
        await UPDATE("leave.LeaveRequest")
          .set({ status: "Rejected" })
          .where({ ID: request_ID });

        console.log(`❌ Leave request ${request_ID} REJECTED`);
        console.log(`Reason: ${comments || "No comments provided"}`);
      }

      console.log("=== Phase 4: Approval processing complete ===");
    } catch (error) {
      console.error("=== ERROR during approval processing ===");
      console.error("Error:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw error;
    }
  });
});
