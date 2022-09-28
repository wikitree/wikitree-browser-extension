var menuData = [
    {"title": "Format Parameters", "action": "AutoFormat"},
    {"title": "Edit Template","action": "EditTemplate"},
    {"title": "Automated corrections", "action": "AutoUpdate"},
    {"title": "Add CategoryInfoBox", "items": [
        {"title": "Cemeteries","items": [
            {"title": "Cemetery", "template": "CategoryInfoBox Cemetery"},
            {"title": "Cemetery Group", "template": "CategoryInfoBox CemeteryGroup"}	
         ]},
        {"title": "Religion", "items": [
            {"title": "Religious Institution Group", "template": "CategoryInfoBox ReligiousInstitutionGroup"}
        ]},
        {"title": "Maintenance", "items": [
            {"title": "Maintenance", "template": "CategoryInfoBox Maintenance"},
            {"title": "Needs", "template": "CategoryInfoBox Needs"},
            {"title": "Needs GEDCOM Cleanup", "template": "CategoryInfoBox NeedsGEDCOMCleanup"},
            {"title": "Unconnected", "template": "CategoryInfoBox Unconnected"},
            {"title": "Unsourced", "template": "CategoryInfoBox Unsourced"}
        ]},
        {"title": "Others", "items": [
            {"title": "Location", "template": "CategoryInfoBox Location"},
            {"title": "Migration", "template": "CategoryInfoBox Migration"},
            {"title": "One Name Study", "template": "CategoryInfoBox OneNameStudy"},
            {"title": "One Place Study", "template": "CategoryInfoBox OnePlaceStudy"},
            {"title": "CategoryInfoBox", "template": "CategoryInfoBox"}
        ]}
    ]},
    {"title": "EditBOT instructions","items": [
        {"title": "Rename Category", "template": "Rename Category"},
        {"title": "Merge Category", "template": "Merge Category"},
        {"title": "Delete Category", "template": "Delete Category"},
        {"title": "Confirm for EditBOT","action": "EditBOTConfirm"}
    ]},
    {"title": "Other templates", "items": [
        {"title": "Aka", "template": "Aka"},
        {"title": "Top Level", "template": "Top Level"},
        {"title": "Geographic Location", "template": "Geographic Location"}
    ]},
    {"title": "Add any template","action": "AddTemplate"},
    {"title": "Help", "help": "Space:WikiTree_Plus_Chrome_Extension#On_Category_pages"}
]
