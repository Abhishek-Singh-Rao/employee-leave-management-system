const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const { Employee, LeaveRequest, LeaveType, Manager, Approval } =
    this.entities;

  /** ----------- VALIDATE EMPLOYEE CREATE (NEW) ----------- **/
  this.before("CREATE", "Employees", async (req) => {
    const { empId, name, email, leaveBalance, managerId } = req.data;

    console.log("=== Backend received Employee CREATE data ===", req.data);

    // Validate empId
    if (!empId || empId.trim() === "") {
      console.error("Missing empId");
      return req.error(400, "Employee ID is required");
    }

    const normalizedEmpId = empId.trim();

    if (normalizedEmpId.length > 10) {
      console.error("EmpId too long:", normalizedEmpId);
      return req.error(400, "Employee ID must be 10 characters or less");
    }

    // Check for duplicate empId
    const existingEmployee = await SELECT.one
      .from("leave.Employee")
      .where({ empId: normalizedEmpId });

    if (existingEmployee) {
      console.error(`Employee ${normalizedEmpId} already exists`);
      return req.error(
        409,
        `Employee with ID '${normalizedEmpId}' already exists`
      );
    }

    // Validate name
    if (!name || name.trim() === "") {
      console.error("Missing name");
      return req.error(400, "Employee name is required");
    }

    const normalizedName = name.trim();

    if (normalizedName.length > 100) {
      console.error("Name too long:", normalizedName);
      return req.error(400, "Employee name must be 100 characters or less");
    }

    // Validate email
    if (!email || email.trim() === "") {
      console.error("Missing email");
      return req.error(400, "Employee email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail.length > 100) {
      console.error("Email too long:", normalizedEmail);
      return req.error(400, "Employee email must be 100 characters or less");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.error("Invalid email format:", normalizedEmail);
      return req.error(400, "Invalid email format");
    }

    // Validate leave balance
    if (leaveBalance !== undefined && leaveBalance !== null) {
      const parsedBalance = parseInt(leaveBalance);
      if (isNaN(parsedBalance) || parsedBalance < 0) {
        console.error("Invalid leave balance:", leaveBalance);
        return req.error(400, "Leave balance must be a positive number");
      }
      req.data.leaveBalance = parsedBalance;
    }

    // Validate managerId if provided
    if (managerId && managerId !== "") {
      const manager = await SELECT.one
        .from("leave.Manager")
        .where({ ID: managerId });

      if (!manager) {
        console.error(`Manager ${managerId} not found`);
        return req.error(404, `Manager with ID '${managerId}' not found`);
      }
    }

    // Update req.data with normalized values
    req.data.empId = normalizedEmpId;
    req.data.name = normalizedName;
    req.data.email = normalizedEmail;

    console.log("=== Employee CREATE validation passed ===", req.data);
  });

  /** ----------- LOG EMPLOYEE CREATE SUCCESS (NEW) ----------- **/
  this.after("CREATE", "Employees", async (data, req) => {
    console.log("✅ Employee created successfully:", {
      ID: data.ID,
      empId: data.empId,
      name: data.name,
      email: data.email,
      leaveBalance: data.leaveBalance,
    });
  });

  /** ----------- VALIDATE EMPLOYEE UPDATE (NEW) ----------- **/
  this.before("UPDATE", "Employees", async (req) => {
    const { name, email, leaveBalance, managerId } = req.data;

    console.log("=== Backend received Employee UPDATE data ===", req.data);

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim() === "") {
        console.error("Missing name");
        return req.error(400, "Employee name cannot be empty");
      }

      const normalizedName = name.trim();

      if (normalizedName.length > 100) {
        console.error("Name too long:", normalizedName);
        return req.error(400, "Employee name must be 100 characters or less");
      }

      req.data.name = normalizedName;
    }

    // Validate email if provided
    if (email !== undefined) {
      if (!email || email.trim() === "") {
        console.error("Missing email");
        return req.error(400, "Employee email cannot be empty");
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedEmail.length > 100) {
        console.error("Email too long:", normalizedEmail);
        return req.error(400, "Employee email must be 100 characters or less");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        console.error("Invalid email format:", normalizedEmail);
        return req.error(400, "Invalid email format");
      }

      req.data.email = normalizedEmail;
    }

    // Validate leave balance if provided
    if (leaveBalance !== undefined) {
      const parsedBalance = parseInt(leaveBalance);
      if (isNaN(parsedBalance) || parsedBalance < 0) {
        console.error("Invalid leave balance:", leaveBalance);
        return req.error(400, "Leave balance must be a positive number");
      }
      req.data.leaveBalance = parsedBalance;
    }

    // Validate managerId if provided
    if (managerId !== undefined && managerId !== null && managerId !== "") {
      const manager = await SELECT.one
        .from("leave.Manager")
        .where({ ID: managerId });

      if (!manager) {
        console.error(`Manager ${managerId} not found`);
        return req.error(404, `Manager with ID '${managerId}' not found`);
      }
    }

    console.log("=== Employee UPDATE validation passed ===");
  });

  /** ----------- VALIDATE LEAVE TYPE CREATE (Phase 5 - Keep Working) ----------- **/
  this.before("CREATE", "LeaveTypes", async (req) => {
    const { code, name, maxDays } = req.data;

    console.log(
      "=== Phase 5: Backend received LeaveType CREATE data ===",
      req.data
    );

    // Validate code
    if (!code || code.trim() === "") {
      console.error("Missing code");
      return req.error(400, "Leave type code is required");
    }

    // Normalize and validate length BEFORE database sees it
    const normalizedCode = code.toUpperCase().trim();

    if (normalizedCode.length > 15) {
      console.error("Code too long:", normalizedCode);
      return req.error(400, "Leave type code must be 15 characters or less");
    }

    // Validate name
    if (!name || name.trim() === "") {
      console.error("Missing name");
      return req.error(400, "Leave type name is required");
    }

    const normalizedName = name.trim();

    if (normalizedName.length > 40) {
      console.error("Name too long:", normalizedName);
      return req.error(400, "Leave type name must be 40 characters or less");
    }

    // Validate maxDays
    if (!maxDays || maxDays <= 0) {
      console.error("Invalid maxDays:", maxDays);
      return req.error(400, "Maximum days must be greater than 0");
    }

    const parsedMaxDays = parseInt(maxDays);
    if (isNaN(parsedMaxDays)) {
      console.error("MaxDays not a number:", maxDays);
      return req.error(400, "Maximum days must be a valid number");
    }

    // Check for duplicate code
    const existingLeaveType = await SELECT.one
      .from("leave.LeaveType")
      .where({ code: normalizedCode });

    if (existingLeaveType) {
      console.error(`Leave type code ${normalizedCode} already exists`);
      return req.error(
        409,
        `Leave type with code '${normalizedCode}' already exists`
      );
    }

    // IMPORTANT: Update req.data with normalized values
    req.data.code = normalizedCode;
    req.data.name = normalizedName;
    req.data.maxDays = parsedMaxDays;

    console.log(
      "=== Phase 5: LeaveType CREATE validation passed ===",
      req.data
    );
  });

  /** ----------- VALIDATE LEAVE TYPE UPDATE (Phase 5 - Keep Working) ----------- **/
  this.before("UPDATE", "LeaveTypes", async (req) => {
    const { name, maxDays } = req.data;

    console.log(
      "=== Phase 5: Backend received LeaveType UPDATE data ===",
      req.data
    );

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim() === "") {
        console.error("Missing name");
        return req.error(400, "Leave type name cannot be empty");
      }

      const normalizedName = name.trim();

      if (normalizedName.length > 40) {
        console.error("Name too long:", normalizedName);
        return req.error(400, "Leave type name must be 40 characters or less");
      }

      req.data.name = normalizedName;
    }

    // Validate maxDays if provided
    if (maxDays !== undefined) {
      const parsedMaxDays = parseInt(maxDays);

      if (isNaN(parsedMaxDays) || parsedMaxDays <= 0) {
        console.error("Invalid maxDays:", maxDays);
        return req.error(
          400,
          "Maximum days must be a valid number greater than 0"
        );
      }

      req.data.maxDays = parsedMaxDays;
    }

    console.log("=== Phase 5: LeaveType UPDATE validation passed ===");
  });

  /** ----------- VALIDATE MANAGER CREATE (Phase 5 - Keep Working) ----------- **/
  this.before("CREATE", "Managers", async (req) => {
    const { name, email } = req.data;

    console.log(
      "=== Phase 5: Backend received Manager CREATE data ===",
      req.data
    );

    // Validate name
    if (!name || name.trim() === "") {
      console.error("Missing name");
      return req.error(400, "Manager name is required");
    }

    const normalizedName = name.trim();

    if (normalizedName.length > 100) {
      console.error("Name too long:", normalizedName);
      return req.error(400, "Manager name must be 100 characters or less");
    }

    // Validate email
    if (!email || email.trim() === "") {
      console.error("Missing email");
      return req.error(400, "Manager email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail.length > 100) {
      console.error("Email too long:", normalizedEmail);
      return req.error(400, "Manager email must be 100 characters or less");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.error("Invalid email format:", normalizedEmail);
      return req.error(400, "Invalid email format");
    }

    // Check for duplicate email
    const existingManager = await SELECT.one
      .from("leave.Manager")
      .where({ email: normalizedEmail });

    if (existingManager) {
      console.error(`Manager with email ${normalizedEmail} already exists`);
      return req.error(
        409,
        `Manager with email '${normalizedEmail}' already exists`
      );
    }

    // Update req.data with normalized values
    req.data.name = normalizedName;
    req.data.email = normalizedEmail;

    console.log("=== Phase 5: Manager CREATE validation passed ===");
  });

  /** ----------- VALIDATE MANAGER UPDATE (Phase 5 - Keep Working) ----------- **/
  this.before("UPDATE", "Managers", async (req) => {
    const { name, email, ID } = req.data;

    console.log(
      "=== Phase 5: Backend received Manager UPDATE data ===",
      req.data
    );

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim() === "") {
        console.error("Missing name");
        return req.error(400, "Manager name cannot be empty");
      }

      const normalizedName = name.trim();

      if (normalizedName.length > 100) {
        console.error("Name too long:", normalizedName);
        return req.error(400, "Manager name must be 100 characters or less");
      }

      req.data.name = normalizedName;
    }

    // Validate email if provided
    if (email !== undefined) {
      if (!email || email.trim() === "") {
        console.error("Missing email");
        return req.error(400, "Manager email cannot be empty");
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedEmail.length > 100) {
        console.error("Email too long:", normalizedEmail);
        return req.error(400, "Manager email must be 100 characters or less");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        console.error("Invalid email format:", normalizedEmail);
        return req.error(400, "Invalid email format");
      }

      // Check for duplicate email (excluding current manager)
      const existingManager = await SELECT.one
        .from("leave.Manager")
        .where({ email: normalizedEmail })
        .and("ID !=", ID);

      if (existingManager) {
        console.error(
          `Another manager with email ${normalizedEmail} already exists`
        );
        return req.error(
          409,
          `Another manager with email '${normalizedEmail}' already exists`
        );
      }

      req.data.email = normalizedEmail;
    }

    console.log("=== Phase 5: Manager UPDATE validation passed ===");
  });

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

  /** ----------- VALIDATE APPROVAL CREATION (Phase 4 - Keep Working) ----------- **/
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

  /** ----------- UPDATE BALANCE AND STATUS AFTER APPROVAL (Phase 4 - Keep Working) ----------- **/
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
