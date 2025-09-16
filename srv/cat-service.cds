using Zdashboard as persistence from '../db/schema';

service DashboardService {
    entity Segments     as projection on persistence.Segments;
    entity Users        as projection on persistence.Users;
    entity Files        as projection on persistence.Files;
    entity FileUsers    as projection on persistence.FileUsers;
    entity Levels       as projection on persistence.Levels;
    entity Contacts     as projection on persistence.Contacts;
    entity ContactTypes as projection on persistence.ContactTypes;
}
