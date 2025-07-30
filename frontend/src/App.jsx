import {BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import React from 'react';
import Calendar from './components/Calendar';



function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Calendar />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;