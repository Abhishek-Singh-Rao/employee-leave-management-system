const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const { Employee, LeaveRequest, LeaveType, Approval } = this.entities;

  /** ----------- VALIDATE LEAVE REQUEST ----------- **/
  this.before("CREATE", "LeaveRequests", async (req) => {
    const { employee_empId, leaveType_code, startDate, endDate } = req.data;

    if (new Date(startDate) > new Date(endDate)) {
      return req.error(400, "Start date must be before end date");
    }

    const employee = await SELECT.one
      .from(Employee)
      .where({ empId: employee_empId });
    if (!employee)
      return req.error(404, `Employee ${employee_empId} not found`);

    const leaveType = await SELECT.one
      .from(LeaveType)
      .where({ code: leaveType_code });
    if (!leaveType)
      return req.error(404, `Leave type ${leaveType_code} not found`);

    const days =
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1;

    if (days > leaveType.maxDays) {
      req.error(
        400,
        `Cannot request more than ${leaveType.maxDays} days for ${leaveType.name}`
      );
    }
    if (days > employee.leaveBalance) {
      req.error(400, "Not enough leave balance");
    }
  });

  /** ----------- UPDATE BALANCE AFTER APPROVAL ----------- **/
  this.after("CREATE", "Approvals", async (data) => {
    const { decision, request_ID } = data;

    if (!request_ID) return;

    if (decision === "APPROVED") {
      const request = await SELECT.one
        .from(LeaveRequest)
        .where({ ID: request_ID });
      if (request) {
        const days =
          (new Date(request.endDate) - new Date(request.startDate)) /
            (1000 * 60 * 60 * 24) +
          1;

        await UPDATE(Employee)
          .set({ leaveBalance: { "-=": days } })
          .where({ empId: request.employee_empId });

        await UPDATE(LeaveRequest)
          .set({ status: "APPROVED" })
          .where({ ID: request_ID });
      }
    } else if (decision === "REJECTED") {
      await UPDATE(LeaveRequest)
        .set({ status: "REJECTED" })
        .where({ ID: request_ID });
    }
  });
});
