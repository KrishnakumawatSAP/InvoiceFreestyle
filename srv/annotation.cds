using Zdashboard as service from './cat-service';
annotate service.Users with {
  Id   @title: 'User ID';
  Name @title: 'User Name';
}

annotate service.Files with {
  Id          @title: 'File ID';
  Title       @title: 'File Title';
  ModifiedAt  @title: 'Modified At';
  ModifiedBy  @title: 'Modified By';
}

annotate service.FileUsers with {
  FileId @title: 'File (UUID)';
  UserId @title: 'User Name';
  Level  @title: 'Level';
}

annotate service.Levels with {
  Id    @title: 'Level';
  Title @title: 'Title';
}

annotate service.Contacts with {
  Email      @title: 'Email';
  Type       @title: 'Type';
  Job        @title: 'Job Title';
  Name       @title: 'Name';
  Phone      @title: 'Phone';
  Username   @title: 'Modified By';
  ChangeDate @title: 'Change Date';
  ChangeTime @title: 'Change Time';
}

annotate service.ContactTypes with {
  Id    @title: 'Code';
  Title @title: 'Description';
}

annotate service.Segments with {
  Id          @title: 'Segment Code';
  Title       @title: 'Segment Name';
  Description @title: 'Segment Description';
  Username    @title: 'User Name';
  ChangeDate  @title: 'Date';
  ChangeTime  @title: 'Time';
}
annotate service.Users with @UI.LineItem: [
  {
    Value: Id,
    Label: 'User ID'
  },
  {
    Value: Name,
    Label: 'User Name'
  }
];

annotate service.Files with @UI.LineItem: [
  {
    Value: Id,
    Label: 'File ID'
  },
  {
    Value: Title,
    Label: 'File Title'
  },
  {
    Value: ModifiedAt,
    Label: 'Modified At'
  },
  {
    Value: ModifiedBy,
    Label: 'Modified By'
  }
];

annotate service.FileUsers with @UI.LineItem: [
  {
    Value: FileId,
    Label: 'File (UUID)'
  },
  {
    Value: UserId,
    Label: 'User Name'
  },
  {
    Value: Level,
    Label: 'Level'
  }
];

annotate service.Levels with @UI.LineItem: [
  {
    Value: Id,
    Label: 'Level'
  },
  {
    Value: Title,
    Label: 'Title'
  }
];

annotate service.Contacts with @UI.LineItem: [
  {
    Value: Name,
    Label: 'Name'
  },
  {
    Value: Job,
    Label: 'Job Title'
  },
  {
    Value: Email,
    Label: 'Email'
  },
  {
    Value: Phone,
    Label: 'Phone'
  },
  {
    Value: Type,
    Label: 'Type'
  },
  {
    Value: Username,
    Label: 'Modified By'
  },
  {
    Value: ChangeDate,
    Label: 'Change Date'
  },
  {
    Value: ChangeTime,
    Label: 'Change Time'
  }
];

annotate service.ContactTypes with @UI.LineItem: [
  {
    Value: Id,
    Label: 'Code'
  },
  {
    Value: Title,
    Label: 'Description'
  }
];

annotate service.Segments with @UI.LineItem: [
  {
    Value: Id,
    Label: 'Segment Code'
  },
  {
    Value: Title,
    Label: 'Segment Name'
  },
  {
    Value: Description,
    Label: 'Segment Description'
  },
  {
    Value: Username,
    Label: 'User Name'
  },
  {
    Value: ChangeDate,
    Label: 'Date'
  },
  {
    Value: ChangeTime,
    Label: 'Time'
  }
];