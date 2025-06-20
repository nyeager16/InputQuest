'use client';
import React, { useState } from 'react';
import { updateUserWordConjugations } from '@/lib/api';
import type { TableData, FormEntry, VerbTable, NounTable, AdjTable } from '@/types/types';

const FlashcardConjugations: React.FC<{ data: TableData }> = ({ data }) => {
  const { table_type, conjugation_table } = data;
  const [editMode, setEditMode] = useState(false);
  const [updatedWords, setUpdatedWords] = useState<Record<number, boolean>>({});

  const baseCellClass = 'border border-gray-300 px-2 py-1 text-center';

  const toggleNeedsReview = (entry: FormEntry) => {
    const newNeedsReview = !entry.needs_review;
    entry.needs_review = newNeedsReview;

    setUpdatedWords(prev => ({
      ...prev,
      [entry.id]: newNeedsReview,
    }));
  };

  const handleSave = async () => {
    const payload = Object.entries(updatedWords).map(([id, needs_review]) => ({
      word_id: Number(id),
      needs_review,
    }));

    try {
      await updateUserWordConjugations(payload);
      setEditMode(false);
      setUpdatedWords({});
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  const renderCell = (entry?: FormEntry) => {
    const highlightClass = entry?.needs_review ? 'bg-green-200' : '';
    const cursorClass = editMode ? 'cursor-pointer' : '';

    return (
      <td
        key={entry?.id}
        className={`${baseCellClass} ${highlightClass} ${cursorClass}`}
        onClick={() => {
          if (editMode && entry) toggleNeedsReview(entry);
        }}
      >
        {entry?.text || ''}
      </td>
    );
  };

  const renderVerbTable = (table: VerbTable) => (
    <>
      <table className="border border-gray-300 border-collapse text-sm text-center mb-0">
        <thead>
          <tr>
            <th colSpan={3} className={`${baseCellClass} bg-gray-100 font-bold`}>Present</th>
          </tr>
          <tr>
            <th className={baseCellClass}></th>
            <th className={baseCellClass}>sg</th>
            <th className={baseCellClass}>pl</th>
          </tr>
        </thead>
        <tbody>
          {['1p', '2p', '3p'].map(row => (
            <tr key={row}>
              <td className={baseCellClass}>{row}</td>
              {renderCell(table.present[row]?.sg)}
              {renderCell(table.present[row]?.pl)}
            </tr>
          ))}
        </tbody>
      </table>
      <table className="border border-gray-300 border-collapse text-sm text-center mb-4">
        <thead>
          <tr>
            <th colSpan={6} className={`${baseCellClass} bg-gray-100 font-bold`}>Past</th>
          </tr>
          <tr>
            <th className={baseCellClass}></th>
            {['m', 'f', 'n', 'mpl', 'opl'].map(col => (
              <th key={col} className={baseCellClass}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['1p', '2p', '3p'].map(row => (
            <tr key={row}>
              <td className={baseCellClass}>{row}</td>
              {['m', 'f', 'n', 'mpl', 'opl'].map(col => renderCell(table.past[row]?.[col]))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Edit
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Save
          </button>
        )}
      </div>
    </>
  );

  const renderNounTable = (table: NounTable) => (
    <table className="border border-gray-300 border-collapse mt-0 text-sm text-center">
      <thead>
        <tr>
          <th className={baseCellClass}></th>
          <th className={baseCellClass}>sg</th>
          <th className={baseCellClass}>pl</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(table).map(caseName => (
          <tr key={caseName}>
            <td className={baseCellClass}>{caseName}</td>
            <td className={baseCellClass}>{table[caseName].sg?.text || ''}</td>
            <td className={baseCellClass}>{table[caseName].pl?.text || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderAdjTable = (table: AdjTable) => {
    const caseOrder = ['nom', 'gen', 'dat', 'acc', 'inst', 'loc', 'voc'];
    const colOrder = ['m', 'n', 'f', 'mpl', 'opl'];

    return (
      <table className="border border-gray-300 border-collapse mt-0 text-sm text-center">
        <thead>
          <tr>
            <th className={baseCellClass}></th>
            {colOrder.map(col => (
              <th key={col} className={baseCellClass}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {caseOrder.map(caseName => {
            const row = table[caseName];
            return (
              <tr key={caseName}>
                <td className={`${baseCellClass} font-semibold`}>
                  {caseName[0].toUpperCase() + caseName.slice(1)}
                </td>
                {colOrder.map(col => {
                  let value: FormEntry | undefined;
                  let colSpan = 1;

                  if (['gen', 'dat', 'inst', 'loc'].includes(caseName)) {
                    if (col === 'm') {
                      value = row['mf'];
                      colSpan = 2;
                    } else if (col === 'mpl') {
                      value = row['pl'];
                      colSpan = 2;
                    } else if (col === 'n' || col === 'opl') {
                      return null; // skip redundant
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
                      className={`${baseCellClass} ${value?.needs_review ? 'bg-green-200' : ''} ${editMode ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (editMode && value) toggleNeedsReview(value);
                      }}
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

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {table_type === 0 && conjugation_table.verb && renderVerbTable(conjugation_table.verb)}
        {table_type === 1 && conjugation_table.noun && renderNounTable(conjugation_table.noun)}
        {table_type === 2 && conjugation_table.adjective && renderAdjTable(conjugation_table.adjective)}
      </div>
    </div>
  );
};

export default FlashcardConjugations;
