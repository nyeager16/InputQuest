import React from 'react';

interface FormEntry {
  id: number;
  text: string;
  needs_review: boolean;
}

type VerbTable = {
  present: Record<string, Record<string, FormEntry>>;
  past: Record<string, Record<string, FormEntry>>;
};

type NounTable = Record<string, Record<'sg' | 'pl', FormEntry>>;

type AdjTable = Record<string, Record<string, FormEntry>>;

type TableData = {
  table_type: number;
  conjugation_table: {
    verb?: VerbTable;
    noun?: NounTable;
    adjective?: AdjTable;
  };
};

const ConjugationTable: React.FC<{ data: TableData }> = ({ data }) => {
  const renderVerbTable = (table: VerbTable) => (
    <>
      <table className="w-full border border-gray-300 border-collapse text-sm mt-0">
        <thead>
          <tr>
            <th colSpan={3} className="border border-gray-300 px-2 py-1 text-center font-bold bg-gray-100">
              Present
            </th>
          </tr>
          <tr>
            <th className="border border-gray-300 px-2 py-1"></th>
            <th className="border border-gray-300 px-2 py-1">sg</th>
            <th className="border border-gray-300 px-2 py-1">pl</th>
          </tr>
        </thead>
        <tbody>
          {['1p', '2p', '3p'].map(row => (
            <tr key={row}>
              <td className="border border-gray-300 px-2 py-1">{row}</td>
              <td className="border border-gray-300 px-2 py-1">{table.present[row]?.sg?.text || ''}</td>
              <td className="border border-gray-300 px-2 py-1">{table.present[row]?.pl?.text || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full border border-gray-300 border-collapse text-sm mt-0">
        <thead>
          <tr>
            <th colSpan={6} className="border border-gray-300 px-2 py-1 text-center font-bold bg-gray-100">
              Past
            </th>
          </tr>
          <tr>
            <th className="border border-gray-300 px-2 py-1"></th>
            {['m', 'f', 'n', 'mpl', 'opl'].map(col => (
              <th key={col} className="border border-gray-300 px-2 py-1">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['1p', '2p', '3p'].map(row => (
            <tr key={row}>
              <td className="border border-gray-300 px-2 py-1">{row}</td>
              {['m', 'f', 'n', 'mpl', 'opl'].map(col => (
                <td key={col} className="border border-gray-300 px-2 py-1">{table.past[row]?.[col]?.text || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const renderNounTable = (table: NounTable) => (
    <table className="w-full border border-gray-300 border-collapse mt-0 text-sm">
      <thead>
        <tr>
          <th className="border border-gray-300 px-2 py-1"></th>
          <th className="border border-gray-300 px-2 py-1">sg</th>
          <th className="border border-gray-300 px-2 py-1">pl</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(table).map(caseName => (
          <tr key={caseName}>
            <td className="border border-gray-300 px-2 py-1">{caseName}</td>
            <td className="border border-gray-300 px-2 py-1">{table[caseName].sg?.text || ''}</td>
            <td className="border border-gray-300 px-2 py-1">{table[caseName].pl?.text || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderAdjTable = (table: AdjTable) => {
    const caseOrder = ['nom', 'gen', 'dat', 'acc', 'inst', 'loc', 'voc'];
    const colOrderMap: Record<string, string[]> = {
      nom: ['m', 'n', 'f', 'mpl', 'opl'],
      gen: ['mf', 'f', 'pl'],
      dat: ['mf', 'f', 'pl'],
      acc: ['m', 'n', 'f', 'mpl', 'opl'],
      inst: ['mf', 'f', 'pl'],
      loc: ['mf', 'f', 'pl'],
      voc: ['m', 'n', 'f', 'mpl', 'opl'],
    };

    return (
      <table className="w-full border border-gray-300 border-collapse mt-0 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 px-2 py-1"></th>
            <th className="border border-gray-300 px-2 py-1">m</th>
            <th className="border border-gray-300 px-2 py-1">n</th>
            <th className="border border-gray-300 px-2 py-1">f</th>
            <th className="border border-gray-300 px-2 py-1">mpl</th>
            <th className="border border-gray-300 px-2 py-1">opl</th>
          </tr>
        </thead>
        <tbody>
          {caseOrder.map((caseName) => {
            const cols = colOrderMap[caseName];
            const row = table[caseName];

            return (
              <tr key={caseName}>
                <td className="border border-gray-300 px-2 py-1 font-semibold">
                  {caseName[0].toUpperCase() + caseName.slice(1)}
                </td>

                {cols.map((col, idx) => {
                  if ((col === 'm' && cols.includes('n')) || (col === 'mpl' && cols.includes('opl'))) {
                    if (idx % 2 === 0) {
                      return (
                        <td
                          key={col}
                          colSpan={2}
                          className="border border-gray-300 px-2 py-1 conjugation-cell"
                          data-word-id={row[col]?.id}
                          id={`cell-${row[col]?.id}`}
                        >
                          {row[col]?.text || ''}
                        </td>
                      );
                    } else {
                      return null;
                    }
                  }

                  return (
                    <td
                      key={col}
                      className="border border-gray-300 px-2 py-1 conjugation-cell"
                      data-word-id={row[col]?.id}
                      id={`cell-${row[col]?.id}`}
                    >
                      {row[col]?.text || ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const { table_type, conjugation_table } = data;

  return (
    <div>
      {table_type === 0 && conjugation_table.verb && renderVerbTable(conjugation_table.verb)}
      {table_type === 1 && conjugation_table.noun && renderNounTable(conjugation_table.noun)}
      {table_type === 2 && conjugation_table.adjective && renderAdjTable(conjugation_table.adjective)}
    </div>
  );
};

export default ConjugationTable;