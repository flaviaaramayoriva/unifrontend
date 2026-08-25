// src/components/admin/PredictionDashboard.jsx
import React, { useEffect, useState } from 'react';
import { fetchPredictionAnalysis } from '../services/predictionsApi';

const PredictionDashboard = () => {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const response = await fetchPredictionAnalysis();
      setAnalysis(response.data || []);
    } catch (err) {
      setError('No se pudieron cargar las predicciones de la IA.');
    } finally {
      setLoading(false);
    }
  };

  // Función para dar color a la "Confianza" de la IA
  const getConfidenceColor = (confianza) => {
    switch (confianza) {
      case 'alta': return '#28a745'; // Verde
      case 'media': return '#ffc107'; // Amarillo
      case 'baja': return '#dc3545'; // Rojo
      default: return '#6c757d';
    }
  };

  if (loading) return <p>Cargando análisis de Inteligencia Artificial...</p>;
  if (error) return <p style={{color: 'red'}}>{error}</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🤖 Análisis Predictivo de Asistencia (IA)</h2>
      <p>Estimaciones generadas automáticamente por el modelo de Machine Learning del sistema.</p>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4', textAlign: 'left' }}>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Evento</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Fecha</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Inscripciones</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Predicción IA</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Confianza</th>
          </tr>
        </thead>
        <tbody>
          {analysis.map((item) => (
            <tr key={item.idevento} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{item.nombreevento}</td>
              <td style={{ padding: '10px' }}>{new Date(item.fechaevento).toLocaleDateString()}</td>
              <td style={{ padding: '10px' }}>{item.participacion_esperada || 0}</td>
              <td style={{ padding: '10px', fontWeight: 'bold', color: '#007bff' }}>
                {item.prediccion_ia} asistentes
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{
                  backgroundColor: getConfidenceColor(item.confianza_ia),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.85em'
                }}>
                  {item.confianza_ia}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PredictionDashboard;