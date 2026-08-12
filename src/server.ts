import express from 'express';

const app = express();

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
