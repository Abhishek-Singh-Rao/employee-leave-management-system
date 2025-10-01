using {leave as db} from '../db/schema';

@path: '/leave'
service LeaveService {
    entity Employees     as projection on db.Employee;
    entity Managers      as projection on db.Manager;
    entity LeaveTypes    as projection on db.LeaveType;
    entity LeaveRequests as projection on db.LeaveRequest;
    entity Approvals     as projection on db.Approval;
}
