const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

const SITE_IDENTIFIER = 'faselhd';
const SITE_NAME = 'Faselhd';
const BASE_URL = process.env.BASE_URL || 'https://web12218x.faselhdx.bid/?s';
const ALTERNATIVE_URL = 'http://195.66.210.99/';

const USER_AGENTS = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function decodeBase64(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

function cleanMovieName(title) {
    return title.replace(/[\[\]()]/g, '').trim();
}

function cleanSeriesName(title) {
    return title.replace(/[\[\]()]/g, '').replace(/S\d{1,2}/g, '').trim();
}

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

async function makeRequest(url, options = {}) {
    const config = {
        headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            ...options.headers
        },
        timeout: 10000,
        ...options
    };

    return await axios.get(url, config);
}

function decodePage(data) {
    const tScriptMatch = data.match(/var adilbo.*?;.*?'(.*?);/s);
    const tIntMatch = data.match(/\/g.....(.*?)\)/s);

    if (tScriptMatch && tIntMatch) {
        let script = tScriptMatch[1].replace(/'/g, '').replace(/\+/g, '').replace(/\n/g, '');
        const sc = script.split('.');
        let page = '';

        for (const elm of sc) {
            try {
                const cElm = Buffer.from(elm + "==", 'base64').toString('utf-8');
                const tChMatch = cElm.match(/(\d+)/);
                if (tChMatch) {
                    const nb = parseInt(tChMatch[0]) + parseInt(tIntMatch[1] || tIntMatch[0] || '0');
                    page += String.fromCharCode(nb);
                }
            } catch (e) {
                continue;
            }
        }
        return page;
    }
    return "";
}

app.get('/api/categories', (req, res) => {
    const categories = {
        movies: {
            'movies': 'أفلام أجنبية',
            'dubbed-movies': 'أفلام مدبلجة',
            'asian-movies': 'أفلام أسيوية',
            'hindi': 'أفلام هندية',
            'anime-movies': 'أفلام انمي',
            'movies-cats/documentary': 'أفلام وثائقية',
            'movies_collections': 'سلاسل افلام كاملة'
        },
        series: {
            'series': 'مسلسلات أجنبية',
            'asian-series': 'مسلسلات أسيوية',
            'series_genres/documentary': 'مسلسلات وثائقية',
            'anime': 'مسلسلات انمي',
            'tvshows': 'برامج تلفزيونية'
        }
    };
    res.json(categories);
});

app.get('/api/movies/:category', async (req, res) => {
    try {
        const category = req.params.category || 'movies';
        const page = req.query.page || 1;
        const url = `${ALTERNATIVE_URL}${category}${page > 1 ? `/page/${page}` : ''}`;

        const response = await makeRequest(url);
        const $ = cheerio.load(response.data);

        const movies = [];
        $('.postDiv').each((i, element) => {
            const $el = $(element);
            const link = $el.find('a').attr('href');
            const title = $el.find('img').attr('alt');
            const thumbnail = $el.find('img').attr('data-src');

            if (title && !title.includes('مواسم') && !title.includes('موسم') && !title.includes('حلقة')) {
                const yearMatch = title.match(/\b(\d{4})\b/g);
                const year = yearMatch ? yearMatch[yearMatch.length - 1] : '';

                movies.push({
                    title: cleanMovieName(title),
                    url: link,
                    thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                    year: year,
                    type: 'movie'
                });
            }
        });

        const hasNextPage = $('.next').length > 0;

        res.json({
            movies,
            pagination: {
                currentPage: parseInt(page),
                hasNextPage,
                nextPage: hasNextPage ? parseInt(page) + 1 : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/movies', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const url = `${ALTERNATIVE_URL}movies${page > 1 ? `/page/${page}` : ''}`;

        const response = await makeRequest(url);
        const $ = cheerio.load(response.data);

        const movies = [];
        $('.postDiv').each((i, element) => {
            const $el = $(element);
            const link = $el.find('a').attr('href');
            const title = $el.find('img').attr('alt');
            const thumbnail = $el.find('img').attr('data-src');

            if (title && !title.includes('مواسم') && !title.includes('موسم') && !title.includes('حلقة')) {
                const yearMatch = title.match(/\b(\d{4})\b/g);
                const year = yearMatch ? yearMatch[yearMatch.length - 1] : '';

                movies.push({
                    title: cleanMovieName(title),
                    url: link,
                    thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                    year: year,
                    type: 'movie'
                });
            }
        });

        const hasNextPage = $('.next').length > 0;

        res.json({
            movies,
            pagination: {
                currentPage: parseInt(page),
                hasNextPage,
                nextPage: hasNextPage ? parseInt(page) + 1 : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/series/:category', async (req, res) => {
    try {
        const category = req.params.category || 'series';
        const page = req.query.page || 1;
        const url = `${ALTERNATIVE_URL}${category}${page > 1 ? `/page/${page}` : ''}`;

        const response = await makeRequest(url);
        const $ = cheerio.load(response.data);

        const series = [];
        const seenTitles = new Set();

        $('.postDiv').each((i, element) => {
            const $el = $(element);
            const link = $el.find('a').attr('href');
            const title = $el.find('img').attr('alt');
            const thumbnail = $el.find('img').attr('data-src');

            if (title) {
                const cleanTitle = cleanSeriesName(title);
                if (!seenTitles.has(cleanTitle)) {
                    seenTitles.add(cleanTitle);
                    series.push({
                        title: cleanTitle,
                        url: link,
                        thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                        type: 'series'
                    });
                }
            }
        });

        const hasNextPage = $('.next').length > 0;

        res.json({
            series,
            pagination: {
                currentPage: parseInt(page),
                hasNextPage,
                nextPage: hasNextPage ? parseInt(page) + 1 : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/series', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const url = `${ALTERNATIVE_URL}series${page > 1 ? `/page/${page}` : ''}`;

        const response = await makeRequest(url);
        const $ = cheerio.load(response.data);

        const series = [];
        const seenTitles = new Set();

        $('.postDiv').each((i, element) => {
            const $el = $(element);
            const link = $el.find('a').attr('href');
            const title = $el.find('img').attr('alt');
            const thumbnail = $el.find('img').attr('data-src');

            if (title) {
                const cleanTitle = cleanSeriesName(title);
                if (!seenTitles.has(cleanTitle)) {
                    seenTitles.add(cleanTitle);
                    series.push({
                        title: cleanTitle,
                        url: link,
                        thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                        type: 'series'
                    });
                }
            }
        });

        const hasNextPage = $('.next').length > 0;

        res.json({
            series,
            pagination: {
                currentPage: parseInt(page),
                hasNextPage,
                nextPage: hasNextPage ? parseInt(page) + 1 : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/search1', async (req, res) => {
    try {
        const query = req.query.q;
        const type = req.query.type;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const results = {
            query: query,
            movies: [],
            series: []
        };

        if (!type || type === 'movies') {
            try {
                const movieQuery = encodeURIComponent(`فيلم ${query}`);
                const movieUrl = `${ALTERNATIVE_URL}?s=${movieQuery}`;

                const movieResponse = await makeRequest(movieUrl);
                const $movies = cheerio.load(movieResponse.data);

                $movies('.postDiv').each((i, element) => {
                    const $el = $movies(element);
                    const link = $el.find('a').attr('href');
                    const title = $el.find('img').attr('alt');
                    const thumbnail = $el.find('img').attr('data-src');

                    if (title && !title.includes('مواسم') && !title.includes('موسم') && !title.includes('حلقة')) {
                        const yearMatch = title.match(/\b(\d{4})\b/g);
                        const year = yearMatch ? yearMatch[yearMatch.length - 1] : '';

                        results.movies.push({
                            title: cleanMovieName(title),
                            url: link,
                            thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                            year: year,
                            type: 'movie'
                        });
                    }
                });
            } catch (movieError) {
                console.error('Movie search error:', movieError.message);
            }
        }

        if (!type || type === 'series') {
            try {
                const seriesQuery = encodeURIComponent(`مسلسل ${query}`);
                const seriesUrl = `${ALTERNATIVE_URL}?s=${seriesQuery}`;

                const seriesResponse = await makeRequest(seriesUrl);
                const $series = cheerio.load(seriesResponse.data);

                const seenTitles = new Set();
                $series('.postDiv').each((i, element) => {
                    const $el = $series(element);
                    const link = $el.find('a').attr('href');
                    const title = $el.find('img').attr('alt');
                    const thumbnail = $el.find('img').attr('data-src');

                    if (title) {
                        const cleanTitle = cleanSeriesName(title);
                        if (!seenTitles.has(cleanTitle)) {
                            seenTitles.add(cleanTitle);
                            results.series.push({
                                title: cleanTitle,
                                url: link,
                                thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                                type: 'series'
                            });
                        }
                    }
                });
            } catch (seriesError) {
                console.error('Series search error:', seriesError.message);
            }
        }

        try {
            const generalQuery = encodeURIComponent(query);
            const generalUrl = `${ALTERNATIVE_URL}?s=${generalQuery}`;

            const generalResponse = await makeRequest(generalUrl);
            const $general = cheerio.load(generalResponse.data);

            const seenMovieTitles = new Set(results.movies.map(m => m.title));
            const seenSeriesTitles = new Set(results.series.map(s => s.title));

            $general('.postDiv').each((i, element) => {
                const $el = $general(element);
                const link = $el.find('a').attr('href');
                const title = $el.find('img').attr('alt');
                const thumbnail = $el.find('img').attr('data-src');

                if (title) {
                    if (title.includes('مواسم') || title.includes('موسم') || title.includes('حلقة') || title.includes('مسلسل')) {
                        const cleanTitle = cleanSeriesName(title);
                        if (!seenSeriesTitles.has(cleanTitle) && (!type || type === 'series')) {
                            seenSeriesTitles.add(cleanTitle);
                            results.series.push({
                                title: cleanTitle,
                                url: link,
                                thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                                type: 'series'
                            });
                        }
                    } else {
                        const cleanTitle = cleanMovieName(title);
                        if (!seenMovieTitles.has(cleanTitle) && (!type || type === 'movies')) {
                            const yearMatch = title.match(/\b(\d{4})\b/g);
                            const year = yearMatch ? yearMatch[yearMatch.length - 1] : '';

                            seenMovieTitles.add(cleanTitle);
                            results.movies.push({
                                title: cleanTitle,
                                url: link,
                                thumbnail: thumbnail ? thumbnail.replace(/[()]/g, '') : '',
                                year: year,
                                type: 'movie'
                            });
                        }
                    }
                }
            });
        } catch (generalError) {
            console.error('General search error:', generalError.message);
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/seasons', async (req, res) => {
    try {
        const seriesUrl = req.query.url;
        if (!seriesUrl) {
            return res.status(400).json({ error: 'Series URL is required' });
        }

        const response = await makeRequest(seriesUrl);
        const $ = cheerio.load(response.data);

        const seasons = [];
        $('.seasonDiv').each((i, element) => {
            const $el = $(element);
            const onclick = $el.attr('onclick');
            const thumbnail = $el.find('img').attr('data-src');
            const title = $el.find('img').attr('alt');
            const seasonTitle = $el.find('.title').text();

            if (onclick) {
                const urlMatch = onclick.match(/window\.location\.href = ['"](.*?)['"]/);
                if (urlMatch) {
                    let seasonUrl = `${ALTERNATIVE_URL.slice(0, -1)}${urlMatch[1]}`;

                    if (seasonUrl.includes('195.66.210.99')) {
                        seasonUrl = seasonUrl.replace('http://195.66.210.99', 'https://www.faselhds.life');
                    }

                    seasons.push({
                        title: `${cleanSeriesName(title)} ${seasonTitle.replace('موسم ', 'S')}`,
                        url: seasonUrl,
                        thumbnail: thumbnail || '',
                        season: seasonTitle
                    });
                }
            }
        });

        res.json({ seasons });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/episodes', async (req, res) => {
    try {
        const seasonUrl = req.query.url;
        if (!seasonUrl) {
            return res.status(400).json({ error: 'Season URL is required' });
        }

        const response = await makeRequest(seasonUrl);
        const $ = cheerio.load(response.data);

        const episodes = [];
        $('#epAll a').each((i, element) => {
            const $el = $(element);
            const link = $el.attr('href');
            const episodeTitle = $el.text().trim();

            if (link && episodeTitle && !episodeTitle.includes('العضوية')) {
                episodes.push({
                    title: episodeTitle.replace('الحلقة ', 'E'),
                    url: link,
                    episodeNumber: episodeTitle.replace('الحلقة ', '')
                });
            }
        });

        res.json({ episodes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/links', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        console.log('Fetching links for URL:', videoUrl);

        const response = await makeRequest(videoUrl);
        let htmlContent = response.data;

        console.log('Response received, content length:', htmlContent.length);

        if (htmlContent.includes('adilbo')) {
            console.log('Found encoded content, decoding...');
            htmlContent = decodePage(htmlContent);
        }

        const $ = cheerio.load(htmlContent);
        const links = [];

        $('button[data-url]').each((i, element) => {
            const $el = $(element);
            const url = $el.attr('data-url');
            const quality = $el.text().trim().toUpperCase();

            if (url) {
                console.log('Found button link:', url, 'Quality:', quality);
                links.push({
                    url: url,
                    quality: quality,
                    type: 'direct'
                });
            }
        });

        const videoSrcMatch = htmlContent.match(/videoSrc\s*=\s*['"]([^'"]+)['"]/);
        if (videoSrcMatch) {
            console.log('Found videoSrc:', videoSrcMatch[1]);
            links.push({
                url: videoSrcMatch[1],
                quality: 'AUTO',
                type: 'direct'
            });
        }

        const iframePattern = /player_iframe\.location\.href\s*=\s*['"]([^'"]+)['"][^<]*<\/i>([^<]+)<\/a>/g;
        let iframeMatch;
        while ((iframeMatch = iframePattern.exec(htmlContent)) !== null) {
            console.log('Found iframe link:', iframeMatch[1], 'Hoster:', iframeMatch[2].trim());
            links.push({
                url: iframeMatch[1],
                hoster: iframeMatch[2].trim(),
                type: 'iframe'
            });
        }

        const directVideoPattern = /<a[^>]+href=['"]([^'"]*\.(?:mp4|m3u8|mkv)[^'"]*)['"]/g;
        let directMatch;
        while ((directMatch = directVideoPattern.exec(htmlContent)) !== null) {
            console.log('Found direct video link:', directMatch[1]);
            links.push({
                url: directMatch[1],
                quality: 'DIRECT',
                type: 'direct'
            });
        }

        const embedPattern = /<iframe[^>]+src=['"]([^'"]+)['"]/g;
        let embedMatch;
        while ((embedMatch = embedPattern.exec(htmlContent)) !== null) {
            const embedUrl = embedMatch[1];
            if (embedUrl.includes('video') || embedUrl.includes('player')) {
                console.log('Found embed link:', embedUrl);
                links.push({
                    url: embedUrl,
                    quality: 'EMBED',
                    type: 'iframe'
                });
            }
        }

        console.log('Total links found:', links.length);
        res.json({ links });
    } catch (error) {
        console.error('Error fetching links:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/video-links', async (req, res) => {
    try {
        const url = req.query.url;
        
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        const { deobfuscate } = require('./lib/synchrony-deobfuscator');
        const HLS = require('hls-parser');
        
        const videoRegex = /(https?:)?\/\/[^"]+\.m3u8/;
        const onClickRegex = /['"](https?:\/\/[^'"]+)['"]/;
        
        const response = await makeRequest(url);
        const $ = cheerio.load(response.data);
        const videos = [];
        
        async function extractFromHls(url) {
            try {
                const requestHeaders = {
                    'Referer': BASE_URL,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                };
                const playlistResponse = await axios.get(url, { headers: requestHeaders });
                const playlist = HLS.parse(playlistResponse.data);
                const videos = [];
                
                if (playlist.isMasterPlaylist) {
                    for (const variant of playlist.variants) {
                        videos.push({
                            quality: `${variant.resolution?.height || 'Unknown'}p`,
                            url: variant.uri.startsWith('http') ? variant.uri : new URL(variant.uri, url).href,
                            bandwidth: variant.bandwidth,
                            resolution: variant.resolution,
                            codecs: variant.codecs
                        });
                    }
                } else {
                    videos.push({
                        quality: 'Default',
                        url: url
                    });
                }
                
                return videos;
            } catch (error) {
                console.error('Error parsing M3U8:', error.message);
                return [];
            }
        }
        
        const servers = $('li:contains(سيرفر)');
        
        for (let i = 0; i < servers.length; i++) {
            const $server = $(servers[i]);
            const onclick = $server.attr('onclick');
            
            if (onclick) {
                const match = onClickRegex.exec(onclick);
                if (match) {
                    const serverUrl = match[1];
                    
                    try {
                        const serverResponse = await makeRequest(serverUrl);
                        const serverDoc = cheerio.load(serverResponse.data);
                        const scripts = serverDoc('script');
                        
                        for (let j = 0; j < scripts.length; j++) {
                            let scriptContent = serverDoc(scripts[j]).html();
                            if (scriptContent && (scriptContent.includes('player') || scriptContent.includes('Player') || scriptContent.includes('video'))) {
                                try {
                                    scriptContent = deobfuscate(scriptContent);
                                } catch (deobError) {
                                    console.log('Deobfuscation failed or not needed, using original script');
                                }
                                
                                const m3u8Match = videoRegex.exec(scriptContent);
                                if (m3u8Match) {
                                    const playlistUrl = m3u8Match[0];
                                    const playlistVideos = await extractFromHls(playlistUrl);
                                    videos.push(...playlistVideos);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching server ${serverUrl}:`, error.message);
                    }
                }
            }
        }
        
        const uniqueVideos = videos.filter((video, index, self) =>
            index === self.findIndex((v) => v.url === video.url)
        );
        
        uniqueVideos.sort((a, b) => {
            const qualityA = parseInt(a.quality) || 0;
            const qualityB = parseInt(b.quality) || 0;
            return qualityB - qualityA;
        });
        
        res.json({ videos: uniqueVideos });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/extract', async (req, res) => {
    try {
        let iframeUrl = req.query.url;
        if (!iframeUrl) {
            return res.status(400).json({ error: 'Iframe URL is required' });
        }

        iframeUrl = decodeURIComponent(iframeUrl);

        console.log('Extracting video source from:', iframeUrl);
        console.log('Full URL length:', iframeUrl.length);
        console.log('Contains vid parameter:', iframeUrl.includes('vid='));

        const response = await makeRequest(iframeUrl);
        let htmlContent = response.data;

        console.log('Iframe response received, content length:', htmlContent.length);

        if (htmlContent.includes('adilbo')) {
            console.log('Found encoded content in iframe, decoding...');
            const decodedContent = decodePage(htmlContent);
            if (decodedContent && decodedContent.length > 0) {
                htmlContent = decodedContent;
                console.log('Successfully decoded content, new length:', htmlContent.length);
            } else {
                console.log('Decoding failed, using original content');
            }
        }

        const contentSample = htmlContent.substring(0, 1000);
        console.log('Content sample (first 1000 chars):', contentSample);

        const videoKeywords = ['scdns', 'm3u8', 'playlist', 'stream', 'hls', 'video', 'src'];
        const foundKeywords = videoKeywords.filter(keyword => htmlContent.includes(keyword));
        console.log('Found video-related keywords:', foundKeywords);

        const videoSources = [];

        const faselhdPatterns = [
            /(https?:\/\/[^'"<>\s\)\(\[\]]+\.scdns\.io\/[^'"<>\s\)\(\[\]]+)/g,
            /(https?:\/\/r\d+--[a-zA-Z0-9]+\.c\.scdns\.io\/[^'"<>\s\)\(\[\]]+)/g,
            /(https?:\/\/[^'"<>\s\)\(\[\]]+\.m3u8[^'"<>\s\)\(\[\]]*)/g,
            /(https?:\/\/[^'"<>\s\)\(\[\]]+\/stream\/v1\/hls\/[^'"<>\s\)\(\[\]]+)/g,
            /(https?:\/\/[^'"<>\s\)\(\[\]]+playlist\.m3u8[^'"<>\s\)\(\[\]]*)/g,
            /(https?:\/\/[^'"<>\s\)\(\[\]]*(?:scdns|stream|hls|playlist|m3u8)[^'"<>\s\)\(\[\]]*)/g
        ];

        for (const pattern of faselhdPatterns) {
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                const streamUrl = match[1];
                console.log('Found FaselHD stream URL:', streamUrl);

                let quality = 'AUTO';
                if (streamUrl.includes('hd720')) quality = 'HD720';
                else if (streamUrl.includes('sd360')) quality = 'SD360';
                else if (streamUrl.includes('hd1080')) quality = 'HD1080';
                else if (streamUrl.includes('sd480')) quality = 'SD480';

                videoSources.push({
                    url: streamUrl,
                    quality: quality,
                    type: 'hls'
                });
            }
        }

        const dataUrlPatterns = [
            /data-url\s*=\s*['"]([^'"]+)['"][^>]*>([^<]+)<\/button>/g,
            /data-url\s*=\s*['"]([^'"]+)['"][^>]*>\s*([^<]+)\s*<\/button>/g,
            /<button[^>]*data-url\s*=\s*['"]([^'"]+)['"][^>]*>([^<]+)<\/button>/g
        ];

        for (const pattern of dataUrlPatterns) {
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                console.log('Found data-url source:', match[1], 'Quality:', match[2].trim());
                videoSources.push({
                    url: match[1],
                    quality: match[2].trim().toUpperCase(),
                    type: 'direct'
                });
            }
        }

        const jsVideoPatterns = [
            /(?:var|let|const)\s+\w+\s*=\s*['"]([^'"]*scdns\.io[^'"]*\.m3u8[^'"]*)['"]/g,
            /(?:var|let|const)\s+\w+\s*=\s*['"]([^'"]*_playlist\.m3u8[^'"]*)['"]/g,
            /['"]?(?:url|src|file|link|source)['"]?\s*:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/g,
            /(?:setSource|setSrc|loadVideo)\s*\(\s*['"]([^'"]*\.m3u8[^'"]*)['"]/g,
            /videoSrc\s*=\s*['"]([^'"]+)['"]/g,
            /video_src\s*=\s*['"]([^'"]+)['"]/g
        ];

        for (const pattern of jsVideoPatterns) {
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                const videoUrl = match[1];
                if (videoUrl && videoUrl.startsWith('http')) {
                    console.log('Found JS video URL:', videoUrl);
                    videoSources.push({
                        url: videoUrl,
                        quality: 'JS_EXTRACTED',
                        type: 'hls'
                    });
                }
            }
        }

        const jsonPatterns = [
            /{[^}]*['"]url['"]:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/g,
            /{[^}]*['"]src['"]:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/g,
            /{[^}]*['"]file['"]:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/g
        ];

        for (const pattern of jsonPatterns) {
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                console.log('Found JSON video URL:', match[1]);
                videoSources.push({
                    url: match[1],
                    quality: 'JSON_EXTRACTED',
                    type: 'hls'
                });
            }
        }

        const base64Pattern = /atob\(['"]([A-Za-z0-9+/=]+)['"]\)/g;
        let base64Match;
        while ((base64Match = base64Pattern.exec(htmlContent)) !== null) {
            try {
                const decoded = Buffer.from(base64Match[1], 'base64').toString('utf-8');
                if (decoded.includes('scdns.io') || decoded.includes('.m3u8')) {
                    console.log('Found base64 decoded video URL:', decoded);
                    videoSources.push({
                        url: decoded,
                        quality: 'BASE64',
                        type: 'hls'
                    });
                }
            } catch (e) {
            }
        }

        const aggressiveM3u8Pattern = /(https?:\/\/[^\s'"<>\(\)\[\]]+\.m3u8[^\s'"<>\(\)\[\]]*)/g;
        let aggressiveMatch;
        while ((aggressiveMatch = aggressiveM3u8Pattern.exec(htmlContent)) !== null) {
            const url = aggressiveMatch[1];
            if (!videoSources.some(source => source.url === url)) {
                console.log('Found aggressive m3u8 URL:', url);
                videoSources.push({
                    url: url,
                    quality: 'FOUND',
                    type: 'hls'
                });
            }
        }

        const allUrlPattern = /(https?:\/\/[^\s'"<>\(\)\[\]]+)/g;
        let urlMatch;
        while ((urlMatch = allUrlPattern.exec(htmlContent)) !== null) {
            const url = urlMatch[1];
            if ((url.includes('scdns') || url.includes('stream') || url.includes('m3u8') || url.includes('mp4')) 
                && !videoSources.some(source => source.url === url)) {
                console.log('Found potential video URL:', url);
                videoSources.push({
                    url: url,
                    quality: 'POTENTIAL',
                    type: 'unknown'
                });
            }
        }

        const nestedIframePattern = /<iframe[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/g;
        let nestedMatch;
        while ((nestedMatch = nestedIframePattern.exec(htmlContent)) !== null) {
            const nestedUrl = nestedMatch[1];
            if (nestedUrl && nestedUrl.includes('video') || nestedUrl.includes('player')) {
                console.log('Found nested iframe that might contain video:', nestedUrl);

                try {
                    const nestedResponse = await makeRequest(nestedUrl);
                    const nestedContent = nestedResponse.data;

                    let nestedVideoMatch;
                    while ((nestedVideoMatch = aggressiveM3u8Pattern.exec(nestedContent)) !== null) {
                        const nestedVideoUrl = nestedVideoMatch[1];
                        if (!videoSources.some(source => source.url === nestedVideoUrl)) {
                            console.log('Found video URL in nested iframe:', nestedVideoUrl);
                            videoSources.push({
                                url: nestedVideoUrl,
                                quality: 'NESTED',
                                type: 'hls'
                            });
                        }
                    }
                } catch (nestedError) {
                    console.log('Could not fetch nested iframe:', nestedError.message);
                }
            }
        }

        const uniqueSources = videoSources.filter((source, index, self) => {
            const isDuplicate = index !== self.findIndex(s => s.url === source.url);
            const isValid = source.url && source.url.length > 10 && source.url.startsWith('http');
            return !isDuplicate && isValid;
        });

        console.log('Total unique video sources found:', uniqueSources.length);

        if (uniqueSources.length === 0) {
            console.log('No direct sources found, returning iframe as fallback');
            uniqueSources.push({
                url: iframeUrl,
                quality: 'IFRAME',
                type: 'iframe'
            });
        }

        res.json({ 
            sources: uniqueSources,
            iframe_url: iframeUrl,
            content_length: htmlContent.length,
            has_encoded_content: htmlContent.includes('adilbo'),
            debug_info: {
                patterns_checked: [
                    'faselhdPatterns',
                    'dataUrlPatterns', 
                    'jsVideoPatterns',
                    'jsonPatterns',
                    'base64Pattern',
                    'aggressiveM3u8Pattern',
                    'nestedIframePattern'
                ]
            }
        });

    } catch (error) {
        console.error('Error extracting video source:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/details', async (req, res) => {
    try {
        let detailsUrl = req.query.url;
        if (!detailsUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (detailsUrl.includes('faselhd')) {
            detailsUrl = detailsUrl.replace('https://www.faselhds.life', ALTERNATIVE_URL.slice(0, -1));
        }

        console.log('Fetching details for:', detailsUrl);

        const response = await makeRequest(detailsUrl);
        let htmlContent = response.data;

        if (htmlContent.includes('adilbo')) {
            console.log('Found encoded content, decoding...');
            htmlContent = decodePage(htmlContent);
        }

        const $ = cheerio.load(htmlContent);

        const title = $('meta[itemprop=name]').attr('content') || 
                     $('.postTitle h1').text().trim() || 
                     $('h1.entry-title').text().trim() || 
                     $('title').text().trim();

        const genres = [];
        $('span:contains(تصنيف) > a, span:contains(مستوى) > a').each((i, elem) => {
            genres.push($(elem).text());
        });
        if (genres.length === 0) {
            $('.genreList a').each((i, element) => {
                const genreText = $(element).text().trim();
                if (genreText && !/^\d{4}$/.test(genreText) && !genreText.includes('دقيقة')) {
                    genres.push(genreText);
                }
            });
        }

        let poster = $('div.posterImg img.poster').attr('src');
        if (!poster) {
            poster = $('div.col-xl-2 > div.seasonDiv:nth-child(1) > img').attr('data-src');
        }
        if (!poster) {
            poster = $('.postImg img').attr('data-src') || $('.postImg img').attr('src') || '';
        }

        let story = $('div.singleDesc').text().trim();
        if (!story) {
            const storySelectors = ['.story', '.postContent p', '.entry-content p', '.synopsis', '.description'];
            for (const selector of storySelectors) {
                const storyText = $(selector).first().text().trim();
                if (storyText && storyText.length > 50) {
                    story = storyText;
                    break;
                }
            }
        }

        const statusText = $('span:contains(حالة)').text().replace('حالة ', '').replace('المسلسل : ', '');
        const status = statusText === 'مستمر' ? 'ongoing' : 'completed';

        const year = $('.postContent .genreList a').filter((i, el) => /^\d{4}$/.test($(el).text())).text() || '';

        const cast = [];
        $('.castList a, .cast a').each((i, element) => {
            const castName = $(element).text().trim();
            if (castName) {
                cast.push(castName);
            }
        });

        let director = '';
        const directorSelectors = ['.director', '.postContent .genreList a[href*="director"]'];
        for (const selector of directorSelectors) {
            const directorText = $(selector).text().trim();
            if (directorText) {
                director = directorText;
                break;
            }
        }

        let duration = '';
        const durationMatch = htmlContent.match(/(\d+)\s*دقيقة/);
        if (durationMatch) {
            duration = `${durationMatch[1]} دقيقة`;
        }

        let rating = '';
        const ratingSelectors = ['.rating', '.imdb-rating', '.vote-average'];
        for (const selector of ratingSelectors) {
            const ratingText = $(selector).text().trim();
            if (ratingText && /\d/.test(ratingText)) {
                rating = ratingText;
                break;
            }
        }

        let contentType = 'movie';
        if (detailsUrl.includes('/series') || detailsUrl.includes('/season') || detailsUrl.includes('/episode') || 
            title.includes('مسلسل') || title.includes('موسم') || $('.seasonDiv').length > 0) {
            contentType = 'series';
        } else if (detailsUrl.includes('/anime') || title.includes('انمي')) {
            contentType = 'anime';
        }

        const metadata = {};

        $('.postContent .genreList a').each((i, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href') || '';
            if (href.includes('country') || href.includes('origin')) {
                metadata.country = text;
            }
        });

        const qualityIndicators = [];
        const qualityKeywords = ['HD', 'CAM', 'DVDRip', 'BluRay', 'WEB-DL', '720p', '1080p', '4K'];
        qualityKeywords.forEach(keyword => {
            if (title.includes(keyword) || htmlContent.includes(keyword)) {
                qualityIndicators.push(keyword);
            }
        });

        let trailer = '';
        const trailerSelector = 'iframe[src*="youtube"], iframe[src*="youtu.be"], a[href*="youtube"], a[href*="youtu.be"]';
        const trailerElement = $(trailerSelector).first();
        if (trailerElement.length > 0) {
            trailer = trailerElement.attr('src') || trailerElement.attr('href') || '';
        }

        let seasonCount = 0;
        if (contentType === 'series') {
            seasonCount = $('.seasonDiv').length;
        }

        const alternativeTitles = [];
        const originalTitle = $('.original-title, .alternative-title').text().trim();
        if (originalTitle && originalTitle !== title) {
            alternativeTitles.push(originalTitle);
        }

        const details = {
            title: title || 'عنوان غير متوفر',
            poster: poster ? poster.replace(/[()]/g, '') : '',
            story: story || 'القصة غير متوفرة',
            genres: genres.join(', '),
            cast: cast,
            director: director,
            year: year,
            duration: duration,
            rating: rating,
            status: status,
            contentType: contentType,
            seasonCount: seasonCount,
            alternativeTitles: alternativeTitles,
            trailer: trailer,
            qualityIndicators: qualityIndicators,
            metadata: metadata,
            sourceUrl: detailsUrl
        };

        console.log('Details extracted successfully for:', title);
        res.json(details);

    } catch (error) {
        console.error('Error fetching details:', error.message);
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/search', async (req, res) => {
    const determineType = (url, title) => {
        if (url.includes('/anime-movies')) return 'فلم انمي';
        if (url.includes('/anime')) return 'انمي';
        if (url.includes('/asian-series')) return 'مسلسل اسيوي';
        if (url.includes('/asian-movies')) return 'فلم اسيوي';
        if (url.includes('/hindi')) return 'هندي';
        if (url.includes('/dubbed-movies')) return 'فلم مدبلج';
        if (url.includes('/series')) return 'مسلسل اجنبي';
        if (url.includes('/movies')) return 'فلم اجنبي';
        if (url.includes('/tvshows')) return 'برنامج';
        
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('فلم') || lowerTitle.includes('movie')) return 'فلم';
        if (lowerTitle.includes('انمي') || lowerTitle.includes('anime')) return 'انمي';
        if (lowerTitle.includes('مسلسل') || lowerTitle.includes('series')) return 'مسلسل';
        if (lowerTitle.includes('برنامج') || lowerTitle.includes('tvshow')) return 'برنامج';
        if (lowerTitle.includes('مدبلج') || lowerTitle.includes('dubbed')) return 'مدبلج';
        
        return 'غير محدد';
    };

    try {
        const query = req.query.q || '';
        const section = req.query.section || '';
        const category = req.query.category || '';
        const genre = req.query.genre || '';
        
        if (!query && (!section || section === 'none') && (!category || category === 'none')) {
            return res.status(400).json({ error: 'Please provide a search query or select a section/category' });
        }
        
        const allResults = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            let url;
            
            if (query) {
                url = page === 1 
                    ? `${BASE_URL}/?s=${encodeURIComponent(query)}`
                    : `${BASE_URL}/page/${page}?s=${encodeURIComponent(query)}`;
            } else if (section && section !== 'none') {
                url = `${BASE_URL}/${section}/page/${page}`;
            } else if (category && category !== 'none' && genre) {
                url = `${BASE_URL}/${category}/${genre.toLowerCase()}/page/${page}`;
            }
            
            const response = await makeRequest(url);
            const $ = cheerio.load(response.data);
            
            const noResults = $('body:contains("لم نجد شيئا")').length > 0;
            if (noResults) {
                hasMore = false;
                break;
            }
            
            const pageResults = [];
            $('div#postList div.col-xl-2 a').each((i, element) => {
                const $elem = $(element);
                const img = $elem.find('div.imgdiv-class img, img');
                const title = img.attr('alt');
                const itemUrl = $elem.attr('href');
                
                pageResults.push({
                    title: title,
                    url: itemUrl,
                    thumbnail: img.attr('data-src'),
                    type: determineType(itemUrl, title)
                });
            });
            
            if (pageResults.length === 0) {
                hasMore = false;
            } else {
                allResults.push(...pageResults);
                page++;
            }
        }
        
        res.json({
            results: allResults,
            totalResults: allResults.length,
            totalPages: page - 1
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        site: SITE_NAME,
        alternative_url: ALTERNATIVE_URL,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`FaselHD API server running on port ${PORT}`);
    console.log(`Using alternative URL: ${ALTERNATIVE_URL}`);
});