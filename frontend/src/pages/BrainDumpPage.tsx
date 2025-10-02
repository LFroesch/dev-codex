// This page will hold a processing tool for brain dumping ideas / tasks etc
// It will have a text area where you input text, and the buttons to process it
// into tasks, notes, etc basically to help you get ideas out of your head
// and into the system quickly and easily
// also potentially integrate with AI to do so? Open AI? or other LLM?
import React, { useState } from 'react';

const BrainDumpPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [processedItems, setProcessedItems] = useState<string[]>([]);

  const handleProcessText = () => {
    // Simple processing: split by new lines and filter out empty lines
    const items = inputText.split('\n').map(item => item.trim()).filter(item => item);
    setProcessedItems(items);
    setInputText(''); // Clear input after processing
  }
    return (
    <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Brain Dump</h1>
        <textarea
            className="w-full h-40 p-2 border border-gray-300 rounded mb-4"
            placeholder="Type or paste your ideas/tasks here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
        />
        <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={handleProcessText}
        >
            Process Text
        </button>
        <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Processed Items</h2>
            {processedItems.length === 0 ? (
                <p>No items processed yet.</p>
            ) : (
                <ul className="list-disc list-inside">
                    {processedItems.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    </div>
  );
}