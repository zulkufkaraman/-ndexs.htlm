# Binance Erken Yükseliş Tarayıcısı

Android Chrome'da kullanılabilen ve HTTPS alanına yüklendiğinde ana ekrana PWA olarak eklenebilen statik web uygulamasıdır. **APK değildir.**

## Kurulum
1. ZIP'i açın.
2. `index.html`, `app.js`, `manifest.webmanifest`, `sw.js` ve `icons` klasörünü aynı yapıyla GitHub Pages, Netlify veya Cloudflare Pages gibi HTTPS statik barındırma alanına yükleyin.
3. Android Chrome'da sitenin HTTPS adresini açın.
4. Tarayıcı menüsünden **Uygulamayı yükle** veya **Ana ekrana ekle** seçin.
5. Uygulamayı açıp **Taramayı başlat** düğmesine dokunun.

Bilgisayarda test: klasör içinde `python -m http.server 8000` çalıştırıp `http://localhost:8000` açılabilir. PWA kurulumu için HTTPS gerekir.

## Neler yapar?
- Binance USDT spot paritelerini 24 saatlik quote hacmine göre sıralar; ilk 50/100/150/200 pariteyi tarar (varsayılan 100).
- 15m, 1h, 4h, 1d ve 1w zaman dilimlerinde 250 mum inceler.
- RSI dönüşü, MACD histogramı/yukarı kesişimi, EMA20/50/200, 5/10 mum momentum ve hacim oranını birleştirerek 0–100 teknik puan üretir.
- 24 saatlik artış, günlük grafikte 5 mumluk getiri ve EMA20'den uzaklaşma için en fazla 25 puan keser. Yatay birikim koşullarına en fazla 4 puan ekler.
- Detay görünümü, filtreleme ve CSV dışa aktarma sunar.

## Güvenlik ve sınırlamalar
- Sadece Binance'in herkese açık REST API uç noktalarını kullanır. Önce `data-api.binance.vision`, sonra genel Binance API adresleri denenir.
- API anahtarı, hesap erişimi veya emir gönderimi yoktur.
- Varsayılan tarama tüm USDT pariteleri değil, hacme göre ilk 100'dür; kapsam ayarından 50/150/200 seçilebilir.
- Her parite için beş zaman diliminde 250 mum istendiği için tarama birkaç dakika sürebilir. Sekmeyi açık tutun.
- Binance'e bölgesel erişim, CORS, ağ veya istek limiti sorunları olursa bazı pariteler alınamayabilir. Eksik verili parite puan listesine eklenmez.
- İnternet olmadan yeni piyasa taraması yapılamaz; çevrimdışı önbellek yalnızca uygulama arayüzünü açmaya yarar.

## Puanlama
Zaman dilimi ağırlıkları: 15m %8, 1h %14, 4h %25, 1d %32, 1w %21.
Her zaman diliminde: RSI 25, MACD 25, EMA 20, momentum 15, hacim 15 puan.
Günlük grafikteki momentum değeri son 5 kapanmış mum üzerinden hesaplanır; 7 günlük getiri değildir.

Resmî kaynaklar:
- https://developers.binance.com/en/docs/products/spot/rest-api
- https://developers.binance.me/en/docs/products/spot/faqs/market_data_only

**Yatırım tavsiyesi değildir.** Teknik göstergeler gecikmeli ve hatalı sinyal üretebilir; puan yükseliş garantisi veya alım/satım önerisi değildir.
