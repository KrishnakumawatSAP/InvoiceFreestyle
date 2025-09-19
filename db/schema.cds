namespace Zdashboard;

using {
  Country,
  sap.common.CodeList as CodeList,
  cuid,
  // User,
  Language,
  managed,
  Currency,
  sap,
    } from '@sap/cds/common';
using {
  sap.common.Region,
  sap.common.UnitOfMeasure,
  sap.common.Criticality
} from './common';


entity Users {
  key Id   : String;
      Name : String;
  toFiles  : association to many FileUsers on toFiles.UserId = Id;
}
entity InvoiceEntity : cuid, managed, {
  documentId             : Integer;
  fiscalYear             : String(4);
  companyCode            : String(4);
  documentDate           : Date;
  postingDate            : Date;
  supInvParty            : String(10);
  documentCurrency       : Association to one sap.common.Currencies;
  invGrossAmount         : Decimal(13, 3);
  DocumentHeaderText     : String(50);
  PaymentTerms           : String(4);
  AccountingDocumentType : String(4);
  InvoicingParty         : String(10);
  status                 : String(200);
  statusFlag             : String(1);
  mode                   : String(10);
  dmsFolder              : String(50);
  senderMail             : String(40);
  logincr                : Integer;
  editmode               : String(5); // for knowing resubmission of failed invoices
  url                    : String;
  template : Boolean @title: 'Template'
  @UI.fieldGroup: [{ qualifier: 'AdminData', position: 40 }]
  @UI.lineItem:   [{ position: 40 }]
  @UI.selectionField: true
  @UI.control: { value: 'sap.m.Switch' };
  statusColor            : Association to one StatusValues
                             on statusColor.code = statusFlag;
  newInvoice             : String(10);
  to_InvoiceItem         : Composition of many InvoiceItemEntity;
  to_InvoiceLogs         : Composition of many InvoiceLogs;
}

entity StatusValues {
  key code           : String(1);
      value          : String(10);
      criticality    : Integer;
      deletePossible : Boolean;
      insertPossible : Boolean;
      updatePossible : Boolean;
}

aspect InvoiceItemEntity : cuid, managed {
  supplierInvoice   : String(10);
  fiscalYear        : String(4);
  sup_InvoiceItem   : String(5);
  purchaseOrder     : String(10);
  purchaseOrderItem : String(5);
  referenceDocument : String(10);
  refDocFiscalYear  : String(4);
  refDocItem        : String(5);
  taxCode           : String(3);
  documentCurrency  : Currency;
  supInvItemAmount  : Decimal(13, 3);
  poQuantityUnit    : String(3);
  quantityPOUnit    : Decimal(13, 3);
  Plant             : String(4);
  TaxJurisdiction   : String(4);
  ProductType       : String(4);
}
aspect InvoiceLogs : cuid, managed {
  stepNo     : Integer;
  logMessage : String(100);
}
entity Files {
  key Id          : UUID;
      Title       : String(100);
      ModifiedAt  : DateTime;
      ModifiedBy  : String(12);
  toUsers         : association to many FileUsers on toUsers.FileId = Id;
}

entity FileUsers {
  key FileId : UUID;
  key UserId : String(12);
      Level  : String(1);
  toFile     : association to Files   on toFile.Id = FileId;
  toUser     : association to Users   on toUser.Id = UserId;
  toLevel    : association to Levels   on toLevel.Id = Level;
}

entity Levels {
  key Id    : String(1);
      Title : String(100);
}

entity Contacts {
  key Email      : String(50);
      Type       : String(1);
      Job        : String(50);
      Name       : String(50);
      Phone      : String(50);
      Username   : String(12);
      ChangeDate : DateTime;
      ChangeTime : Time;
  ContactType    : association to ContactTypes on ContactType.Id = Type;
}

entity ContactTypes {
  key Id    : String(1);
      Title : String;
}

entity Segments {
  key Id          : String(3);
      Title       : String(50);
      Description : String(250);
      Username    : String(12);
      ChangeDate  : DateTime;
      ChangeTime  : Time;
}
