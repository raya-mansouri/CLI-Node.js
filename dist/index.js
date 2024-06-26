import { Command } from 'commander';
import axios from 'axios';
import open from 'open';
import moment from 'moment';
import * as dotenv from 'dotenv';
dotenv.config();
const program = new Command();
program
    .name('mansourycli')
    .description('CLI to interact with HackerNews and more')
    .version('1.0.0');
program
    .command('top')
    .description('HackerNews recent top posts')
    .option('-n, --number <number>', 'Number of posts to display', '10')
    .option('-f, --format <format>', 'Output format (text or json)', 'text')
    .action(async (options) => {
    const { number, format } = options;
    try {
        const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
        const topPostIds = response.data.slice(0, number);
        const postPromises = topPostIds.map((id) => axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`));
        const posts = await Promise.all(postPromises);
        if (format === 'json') {
            console.log(JSON.stringify(posts.map(post => post.data), null, 2));
        }
        else {
            posts.forEach((post, index) => {
                console.log(`${index + 1}. ${post.data.title} (by ${post.data.by})`);
            });
        }
        const stdin = process.stdin;
        console.log('Enter the post number to open in browser:');
        stdin.addListener('data', async function (d) {
            const input = parseInt(d.toString().trim(), 10);
            if (input > 0 && input <= number) {
                const post = posts[input - 1];
                if (post.data.url) {
                    await open(post.data.url);
                }
                else {
                    console.log('No URL for this post.');
                }
            }
            else {
                console.log('Invalid post number.');
            }
            stdin.removeAllListeners('data');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Error fetching top posts:', error);
    }
});
program
    .command('now')
    .description('Displays the current datetime')
    .option('--unix', 'Current datetime in UNIX format')
    .action((options) => {
    const now = moment();
    if (options.unix) {
        console.log(now.unix());
    }
    else {
        console.log(now.format());
    }
});
program
    .command('weather')
    .description('Displays the current weather')
    .action(async () => {
    try {
        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) {
            console.error('WEATHER_API_KEY is not defined');
            return;
        }
        const response = await axios.get(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=qom`);
        const weather = response.data;
        console.log(`Current temperature in ${weather.location.name}: ${weather.current.temp_c}°C`);
        console.log(`Condition: ${weather.current.condition.text}`);
        console.log(`Humidity: ${weather.current.humidity}%`);
        console.log(`Wind: ${weather.current.wind_kph} kph`);
    }
    catch (error) {
        if (error.response) {
            // The request was made, but the server responded with a status code that falls out of the range of 2xx
            console.error('Error fetching weather:', error.response.data);
        } else if (error.request) {
            // The request was made, but no response was received
            console.error('No response received:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error:', error.message);
        }
    }
});
program.parse(process.argv);