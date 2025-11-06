using Zdashboard as persistence from '../db/schema';
using {Attachments} from '@cap-js/sdm';

service DashboardService {
    // @odata.draft.enabled
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
    action postInvoice(documentNumber : String,
                       netAmount : String,
                       taxId : String,
                       taxName : String,
                       purchaseOrderNumber : String,
                       grossAmount : String,
                       currencyCode : String,
                       receiverContact : String,
                       documentDate : String,
                       taxAmount : String,
                       taxRate : String,
                       receiverName : String,
                       receiverAddress : String,
                       paymentTerms : String,
                       senderAddress : String,
                       senderName : String,
                       senderMail : String,
                       dmsFolder : String,
                       to_Item : many {
        description    : String;
        netAmount      : String;
        quantity       : String;
        unitPrice      : String;
        materialNumber : String;
        unitOfMeasure  : String;
    })                                         returns {
        documentId     : String(10);
        invoiceNo      : String(10);
        FiscalYear     : String(4);
        grossAmount    : String;
        message        : String;
        indicator      : String(1);
        url            : String;
    };
}
