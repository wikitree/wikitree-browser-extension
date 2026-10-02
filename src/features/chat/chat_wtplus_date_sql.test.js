import { normalizeWtPlusDateSql } from "./chat_wtplus_date_sql";

describe("normalizeWtPlusDateSql", () => {
  test("a whole-year range keeps year-only and month-only dates", () => {
    expect(normalizeWtPlusDateSql('Location=X sql="([Default].[Birth Date].AsNumber In 18500101..19001231)"')).toBe(
      'Location=X sql="([Default].[Birth Date].AsNumber In 18500000..19009999)"'
    );
    expect(normalizeWtPlusDateSql('sql="([Marriage].[Marriage Date].AsNumber In 19000101..19991231)"')).toBe(
      'sql="([Marriage].[Marriage Date].AsNumber In 19000000..19999999)"'
    );
  });

  test("'before a year' leaves out profiles with no date", () => {
    expect(normalizeWtPlusDateSql('BirthLocation=Devon sql="([Default].[Birth Date].AsNumber < 17500000)"')).toBe(
      'BirthLocation=Devon sql="([Default].[Birth Date].AsNumber In 1..17499999)"'
    );
    expect(normalizeWtPlusDateSql('sql="([Default].[Death Date].AsNumber < 19000101)"')).toBe(
      'sql="([Default].[Death Date].AsNumber In 1..18999999)"'
    );
  });

  test("leaves other comparisons alone", () => {
    const queries = [
      'sql="([Default].[Birth Date].AsNumber In 18200000..18299999)"',
      'sql="([Default].[Birth Date].AsNumber In 1..17499999)"',
      'sql="([Default].[Death Date].AsNumber > 19009999)"',
      'sql="([Default].[Birth Date].AsNumber - [Default].[Father Birth Date].AsNumber < 140000)"',
      'sql="([Default].[Birth Date].AsNumber < 18500615)"',
    ];
    queries.forEach((query) => expect(normalizeWtPlusDateSql(query)).toBe(query));
  });
});
