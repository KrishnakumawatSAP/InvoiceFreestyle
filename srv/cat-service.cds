using Zdashboard as persistence from '../db/schema';
using {Attachments} from '@cap-js/sdm';

service DashboardService {
    entity Invoice      as projection on persistence.InvoiceEntity;
    extend persistence.InvoiceEntity with {
        @description: 'Attachments Composition'
        attachments : Composition of many Attachments;
    };
    entity InvoiceItem              as projection on persistence.InvoiceEntity.to_InvoiceItem;
    entity InvoiceLogs              as projection on persistence.InvoiceEntity.to_InvoiceLogs;
 
    entity Segments     as projection on persistence.Segments;
    entity Users        as projection on persistence.Users;
    entity Files        as projection on persistence.Files;
    entity FileUsers    as projection on persistence.FileUsers;
    entity Levels       as projection on persistence.Levels;
    entity Contacts     as projection on persistence.Contacts;
    entity ContactTypes as projection on persistence.ContactTypes;
}
