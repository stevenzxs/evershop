import bodyParser from 'body-parser';

export default bodyParser.json({ limit: '64kb', inflate: false });
