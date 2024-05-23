
const { Router } = require('express');
const express = require('express');
const path = require('path');

const spaRouter = Router();

const build_folder = 'spa_build';

spaRouter.use(express.static(path.join(__dirname, build_folder)));

spaRouter.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, build_folder, 'index.html'));
});

module.exports = {
    spaRouter,
};
