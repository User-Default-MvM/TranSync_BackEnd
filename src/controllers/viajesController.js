const Viajes = require('../models/viajesModel');

exports.getViajes = async (req, res) => {
  try {
    const viajes = await Viajes.getAll();
    res.json(viajes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getViaje = async (req, res) => {
  try {
    const viaje = await Viajes.getById(req.params.id);
    if (!viaje) return res.status(404).json({ message: 'Viaje no encontrado' });
    res.json(viaje);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createViaje = async (req, res) => {
  try {
    const nuevo = await Viajes.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateViaje = async (req, res) => {
  try {
    const actualizado = await Viajes.update(req.params.id, req.body);
    res.json(actualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteViaje = async (req, res) => {
  try {
    const result = await Viajes.delete(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
