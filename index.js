
const express = require('express');
const cors = require('cors');

const { spaRouter } = require('./spa.js');
const { apiRouter, updateMinuteCache, updateHourCache } = require('./api.js');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/', apiRouter);
app.use('/', spaRouter);

const port = 3001;

app.listen(port, () => {

    updateMinuteCache();
    const updateMinuteCacheSeconds = 60;
    setInterval(
        updateMinuteCache,
        updateMinuteCacheSeconds * 1000
    );

    updateHourCache();
    const updateHourCacheSeconds = 60 * 60;
    setInterval(
        updateHourCache,
        updateHourCacheSeconds * 1000
    );

    console.log(`Example app listening on port ${port}`);
});
