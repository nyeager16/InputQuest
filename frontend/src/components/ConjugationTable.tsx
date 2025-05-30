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
      <table className="w-full border border-gray-300 border-collapse text-sm mt-0 text-center">
        <thead>
          <tr>
            <th colSpan={3} className="border border-gray-300 px-2 py-1 font-bold bg-gray-100 text-center">
              Present
            </th>
          </tr>
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-center"></th>
            <th className="border border-gray-300 px-2 py-1 text-center">sg</th>
            <th className="border border-gray-300 px-2 py-1 text-center">pl</th>
          </tr>
        </thead>
        <tbody>
          {['1p', '2p', '3p'].map(row => (
            <tr key={row}>
              <td className="border border-gray-300 px-2 py-1 text-center">{row}</td>
              <td className="border border-gray-300 px-2 py-1 text-center">{table.present[row]?.sg?.text || ''}</td>
              <td className="border border-gray-300 px-2 py-1 text-center">{table.present[row]?.pl?.text || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full border border-gray-300 border-collapse text-sm mt-0 text-center">
        <thead>
          <tr>
            <th colSpan={6} className="border border-gray-300 px-2 py-1 font-bold bg-gray-100 text-center">
              Past
            </th>
          </tr>
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-center"></th>
            {['m', 'f', 'n', 'mpl', 'opl'].map(col => (
              <th key={col} className="border border-gray-300 px-2 py-1 text-center">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['1p', '2p', '3p'].map(row => (
            <tr key={row}>
              <td className="border border-gray-300 px-2 py-1 text-center">{row}</td>
              {['m', 'f', 'n', 'mpl', 'opl'].map(col => (
                <td key={col} className="border border-gray-300 px-2 py-1 text-center">{table.past[row]?.[col]?.text || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const renderNounTable = (table: NounTable) => (
    <table className="w-full border border-gray-300 border-collapse mt-0 text-sm text-center">
      <thead>
        <tr>
          <th className="border border-gray-300 px-2 py-1 text-center"></th>
          <th className="border border-gray-300 px-2 py-1 text-center">sg</th>
          <th className="border border-gray-300 px-2 py-1 text-center">pl</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(table).map(caseName => (
          <tr key={caseName}>
            <td className="border border-gray-300 px-2 py-1 text-center">{caseName}</td>
            <td className="border border-gray-300 px-2 py-1 text-center">{table[caseName].sg?.text || ''}</td>
            <td className="border border-gray-300 px-2 py-1 text-center">{table[caseName].pl?.text || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderAdjTable = (table: AdjTable) => {
    const caseOrder = ['nom', 'gen', 'dat', 'acc', 'inst', 'loc', 'voc'];
    const colOrderMap: Record<string, string[]> = {
      nom: ['m', 'n', 'f', 'mpl', 'opl'],
      gen: ['m', 'n', 'f', 'mpl', 'opl'],
      dat: ['m', 'n', 'f', 'mpl', 'opl'],
      acc: ['m', 'n', 'f', 'mpl', 'opl'],
      inst: ['m', 'n', 'f', 'mpl', 'opl'],
      loc: ['m', 'n', 'f', 'mpl', 'opl'],
      voc: ['m', 'n', 'f', 'mpl', 'opl'],
    };

    return (
      <table className="w-full border border-gray-300 border-collapse mt-0 text-sm text-center">
        <thead>
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-center"></th>
            <th className="border border-gray-300 px-2 py-1 text-center">m</th>
            <th className="border border-gray-300 px-2 py-1 text-center">n</th>
            <th className="border border-gray-300 px-2 py-1 text-center">f</th>
            <th className="border border-gray-300 px-2 py-1 text-center">mpl</th>
            <th className="border border-gray-300 px-2 py-1 text-center">opl</th>
          </tr>
        </thead>
        <tbody>
          {caseOrder.map((caseName) => {
            const cols = colOrderMap[caseName];
            const row = table[caseName];

            return (
              <tr key={caseName}>
                <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                  {caseName[0].toUpperCase() + caseName.slice(1)}
                </td>

                {cols.map((col) => {
                  let value: FormEntry | undefined;
                  let colSpan = 1;

                  if (['gen', 'dat', 'inst', 'loc'].includes(caseName)) {
                    if (col === 'm') {
                      value = row['mf'];
                      colSpan = 2;
                    } else if (col === 'n') {
                      return null;
                    } else if (col === 'mpl') {
                      value = row['pl'];
                      colSpan = 2;
                    } else if (col === 'opl') {
                      return null;
                    } else {
                      value = row[col];
                    }
                  } else {
                    value = row[col];
                  }

                  return (
                    <td
                      key={col}
                      colSpan={colSpan}
                      className="border border-gray-300 px-2 py-1 text-center conjugation-cell"
                      data-word-id={value?.id}
                      id={`cell-${value?.id}`}
                    >
                      {value?.text || ''}
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
