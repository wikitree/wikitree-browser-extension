import { validateAndRepairWtPlusQuery } from "./wt_plus_query_grammar";

describe("wt_plus_sql_edge_corpus", () => {
  const sqlCorpus = [
    "sql=\"([Default].[First Name].AsString = '')\"",
    'sql="([Default].[Birth Date].AsNumber < 18520101)"',
    'sql="([Default].[Birth Date].AsNumber > 18520101)"',
    'sql="([Default].[Birth Date].AsNumber In 19500000..19599999)"',
    "sql=\"([Default].[Birth Date].AsString Like '*00')\"",
    "sql=\"([Default].[Birth Date].AsString Like '*0000')\"",
    'sql="([Default].[Death Date].AsNumber < 18520101)"',
    'sql="([Default].[Death Age].AsNumber > 100)"',
    "sql=\"([Default].[Birth Location].AsString Like '*azores*')\"",
    "sql=\"([Default].[Death Location].AsString Like '*azores*')\"",
    "sql=\"([Default].[Death Location Country].AsString = 'canada')\"",
    "sql=\"(Trim([Default].[Death Location Country, Region, City].AsString) = '')\"",
    "sql=\"([Marriage].[Marriage Date].AsString Like '190112**')\"",
    'sql="([Marriage].[Marriage Date] in 14991231..19731231)"',
    "sql=\"([Marriage].[Marriage Location].AsString like '*west_sussex*')\"",
    'sql="([Marriage].[Marriage Location].LineCount = 1)"',
    'sql="([Marriage].[Marriage Date].LineCount > 2)"',
    'sql="([Default].[Father id].AsNumber = 0)"',
    'sql="([Default].[Mother id].AsNumber = 0)"',
    'sql="([Children].[User ID].LineCount > 5)"',
    'sql="([Siblings].[User ID].LineCount > 5)"',
    'sql="([Default].[Privacy].AsNumber > 40)"',
    'sql="([Default].[Privacy].AsNumber < 50)"',
    'sql="([Bio].[Created Date].AsNumber > 20240101)"',
    'sql="([Bio].[Created Date].AsNumber < 20240101)"',
    'sql="([Bio].[LastEdit Date].AsNumber In 20240101..20241231)"',
    'sql="([Bio].[Created Year].AsNumber = 2020)"',
    'sql="([Default].[Nr of errors].AsNumber > 10)"',
    'sql="([Manager].[ManagerWikitreeId].LineCount > 1)"',
    'sql="([Categories].[Category].LineCount = 0)"',
    "sql=\"([Bio].[GED File].AsString <> '')\"",
    "sql=\"([Bio].[Headings].AsString Like '*acknowledgements*')\"",
    "sql=\"Not([Bio].[Headings].AsString Like '*B2*S2*')\"",
    "sql=\"Not ([Default].[All Categories].AsString Like '*dombrowken,_strasburg,_westpreussen*')\"",
    "sql=\"([Templates].[Template name].AsString = 'community_event') And ([Templates].[Template text].AsString Like '*2023*')\"",
    "sql=\"([Templates].[Template text].AsString Like '*=right*')\"",
    "sql=\"([Default].[All Managers].AsString = 'guile-361')\"",
    "sql=\"([Bio].[Replicated DNA mtHaplogroup].AsString Like '*h1c*')\"",
    "sql=\"([Bio].[Replicated DNA yHaplogroup].AsString Like '*r1b*')\"",
    "sql=\"([Bio].[Replicated DNA GedMatchID].AsString Like '*t660921*')\"",
    "sql=\"([Bio].[Replicated DNA mitoyDNAID].AsString Like '*12345*')\"",
    "sql=\"([bio].[replicated audna lnabs].asstring like '*waldron*')\"",
  ];

  for (const sqlQuery of sqlCorpus) {
    test(`accepts SQL edge query: ${sqlQuery}`, () => {
      const result = validateAndRepairWtPlusQuery(sqlQuery);
      expect(result.isValid).toBe(true);
      expect(result.normalizedQuery).toBe(sqlQuery);
    });
  }
});
