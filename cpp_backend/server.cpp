#ifdef _WIN32
#if !defined(_WIN32_WINNT) || _WIN32_WINNT < 0x0A00
#undef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00
#endif
#if !defined(NTDDI_VERSION) || NTDDI_VERSION < 0x0A000000
#undef NTDDI_VERSION
#define NTDDI_VERSION 0x0A000000
#endif
#if !defined(WINVER) || WINVER < _WIN32_WINNT
#undef WINVER
#define WINVER _WIN32_WINNT
#endif
#endif

#include <algorithm>
#include <chrono>
#include <cctype>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <deque>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <mutex>
#include <optional>
#include <random>
#include <regex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#ifdef _WIN32
#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00
#endif
#ifndef NTDDI_VERSION
#define NTDDI_VERSION 0x0A000000
#endif
#ifndef WINVER
#define WINVER _WIN32_WINNT
#endif
#include <winsock2.h>
#include <windows.h>
#include <bcrypt.h>
#pragma comment(lib, "bcrypt.lib")
#else
#include <openssl/evp.h>
#endif

#include "third_party/httplib.h"
#include "third_party/json.hpp"

namespace fs = std::filesystem;
using json = nlohmann::json;

namespace {

constexpr const char *kDefaultHost = "127.0.0.1";
constexpr int kDefaultPort = 8000;
constexpr size_t kMaxJsonBytes = 64 * 1024;
constexpr int64_t kSessionTtlSeconds = 60 * 60 * 24 * 14;
constexpr int64_t kOAuthStateTtlSeconds = 10 * 60;
constexpr size_t kMaxPostBodyChars = 3000;
constexpr size_t kMaxCommentBodyChars = 600;
constexpr size_t kMaxMessageBodyChars = 1200;
constexpr size_t kMaxMediaUrlChars = 1024;
constexpr size_t kMaxUploadBytes = 25 * 1024 * 1024;
constexpr int kShortReelMaxSeconds = 90;

const std::regex kUsernameRe(R"(^[A-Za-z0-9_]{3,32}$)");
const std::regex kEmailRe(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)");
const std::regex kHttpUrlRe(R"(^https?://)", std::regex::icase);
const std::regex kTopicRe(R"(^[a-z0-9][a-z0-9-]{1,48}$)");

const std::vector<std::string> kAllowedPostTypes{
    "Text",
    "Image",
    "Video",
    "Reel",
    "News",
};

const std::unordered_map<std::string, std::pair<size_t, int64_t>> kRateLimits{
    {"register", {8, 300}},
    {"login", {15, 300}},
    {"write", {120, 300}},
};

int64_t unix_now() {
  return static_cast<int64_t>(
      std::chrono::duration_cast<std::chrono::seconds>(
          std::chrono::system_clock::now().time_since_epoch())
          .count());
}

std::string trim_copy(const std::string &value) {
  size_t start = 0;
  while (start < value.size() && std::isspace(static_cast<unsigned char>(value[start]))) {
    ++start;
  }
  size_t end = value.size();
  while (end > start && std::isspace(static_cast<unsigned char>(value[end - 1]))) {
    --end;
  }
  return value.substr(start, end - start);
}

std::string lower_copy(const std::string &value) {
  std::string out = value;
  std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  return out;
}

std::string normalize_phone_number(const std::string &value) {
  std::string out;
  for (unsigned char c : value) {
    if (std::isdigit(c)) {
      out.push_back(static_cast<char>(c));
    }
  }
  return out;
}

bool starts_with(const std::string &value, const std::string &prefix) {
  return value.size() >= prefix.size() &&
         std::equal(prefix.begin(), prefix.end(), value.begin());
}

std::string env_string(const char *name, const std::string &fallback) {
  const char *value = std::getenv(name);
  if (!value) return fallback;
  const std::string trimmed = trim_copy(value);
  return trimmed.empty() ? fallback : trimmed;
}

int env_int(const char *name, int fallback) {
  const char *value = std::getenv(name);
  if (!value) return fallback;
  try {
    const int parsed = std::stoi(trim_copy(value));
    return parsed > 0 ? parsed : fallback;
  } catch (...) {
    return fallback;
  }
}

bool contains_ignore_case(const std::string &haystack, const std::string &needle_lower) {
  if (needle_lower.empty()) return true;
  return lower_copy(haystack).find(needle_lower) != std::string::npos;
}

bool contains_value(const std::vector<std::string> &values, const std::string &target) {
  return std::find(values.begin(), values.end(), target) != values.end();
}

std::vector<uint8_t> random_bytes(size_t count) {
  std::vector<uint8_t> bytes(count, 0);
#ifdef _WIN32
  if (BCryptGenRandom(nullptr, bytes.data(), static_cast<ULONG>(bytes.size()),
                      BCRYPT_USE_SYSTEM_PREFERRED_RNG) == 0) {
    return bytes;
  }
#endif
  std::random_device rd;
  for (auto &b : bytes) {
    b = static_cast<uint8_t>(rd());
  }
  return bytes;
}

std::string base64_encode(const std::vector<uint8_t> &input) {
  static constexpr char kTable[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string out;
  out.reserve(((input.size() + 2) / 3) * 4);
  size_t i = 0;
  while (i + 2 < input.size()) {
    const uint32_t triple = (static_cast<uint32_t>(input[i]) << 16) |
                            (static_cast<uint32_t>(input[i + 1]) << 8) |
                            static_cast<uint32_t>(input[i + 2]);
    out.push_back(kTable[(triple >> 18) & 0x3F]);
    out.push_back(kTable[(triple >> 12) & 0x3F]);
    out.push_back(kTable[(triple >> 6) & 0x3F]);
    out.push_back(kTable[triple & 0x3F]);
    i += 3;
  }
  if (i < input.size()) {
    uint32_t triple = static_cast<uint32_t>(input[i]) << 16;
    bool has_second = false;
    if (i + 1 < input.size()) {
      triple |= static_cast<uint32_t>(input[i + 1]) << 8;
      has_second = true;
    }
    out.push_back(kTable[(triple >> 18) & 0x3F]);
    out.push_back(kTable[(triple >> 12) & 0x3F]);
    out.push_back(has_second ? kTable[(triple >> 6) & 0x3F] : '=');
    out.push_back('=');
  }
  return out;
}

std::optional<std::vector<uint8_t>> base64_decode(const std::string &input) {
  auto decode_char = [](unsigned char c) -> int {
    if (c >= 'A' && c <= 'Z') return c - 'A';
    if (c >= 'a' && c <= 'z') return c - 'a' + 26;
    if (c >= '0' && c <= '9') return c - '0' + 52;
    if (c == '+') return 62;
    if (c == '/') return 63;
    return -1;
  };

  if (input.size() % 4 != 0) {
    return std::nullopt;
  }

  std::vector<uint8_t> out;
  out.reserve((input.size() / 4) * 3);
  for (size_t i = 0; i < input.size(); i += 4) {
    int vals[4];
    for (int j = 0; j < 4; ++j) {
      char c = input[i + static_cast<size_t>(j)];
      if (c == '=') {
        vals[j] = -2;
      } else {
        vals[j] = decode_char(static_cast<unsigned char>(c));
        if (vals[j] < 0) return std::nullopt;
      }
    }

    if (vals[0] < 0 || vals[1] < 0) return std::nullopt;

    uint32_t triple = (static_cast<uint32_t>(vals[0]) << 18) |
                      (static_cast<uint32_t>(vals[1]) << 12);
    out.push_back(static_cast<uint8_t>((triple >> 16) & 0xFF));

    if (vals[2] >= 0) {
      triple |= static_cast<uint32_t>(vals[2]) << 6;
      out.push_back(static_cast<uint8_t>((triple >> 8) & 0xFF));
    } else if (vals[2] == -2 && vals[3] != -2) {
      return std::nullopt;
    }

    if (vals[3] >= 0) {
      triple |= static_cast<uint32_t>(vals[3]);
      out.push_back(static_cast<uint8_t>(triple & 0xFF));
    } else if (vals[3] != -2) {
      return std::nullopt;
    }
  }

  return out;
}

std::string base64url_encode(const std::vector<uint8_t> &input) {
  std::string out = base64_encode(input);
  std::replace(out.begin(), out.end(), '+', '-');
  std::replace(out.begin(), out.end(), '/', '_');
  while (!out.empty() && out.back() == '=') {
    out.pop_back();
  }
  return out;
}

std::string base64url_encode_string(const std::string &input) {
  return base64url_encode(std::vector<uint8_t>(input.begin(), input.end()));
}

std::string url_encode(const std::string &value) {
  static constexpr char kHex[] = "0123456789ABCDEF";
  std::string out;
  out.reserve(value.size() * 3);
  for (unsigned char c : value) {
    if (std::isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
      out.push_back(static_cast<char>(c));
    } else {
      out.push_back('%');
      out.push_back(kHex[(c >> 4) & 0x0F]);
      out.push_back(kHex[c & 0x0F]);
    }
  }
  return out;
}

std::string query_from_params(const httplib::Params &params) {
  std::string out;
  bool first = true;
  for (const auto &param : params) {
    if (!first) out.push_back('&');
    first = false;
    out += url_encode(param.first);
    out.push_back('=');
    out += url_encode(param.second);
  }
  return out;
}

bool constant_time_equals(const std::vector<uint8_t> &a, const std::vector<uint8_t> &b) {
  if (a.size() != b.size()) return false;
  uint8_t diff = 0;
  for (size_t i = 0; i < a.size(); ++i) {
    diff |= (a[i] ^ b[i]);
  }
  return diff == 0;
}

bool pbkdf2_sha256(const std::string &password, const std::vector<uint8_t> &salt,
                   uint64_t iterations, size_t key_len, std::vector<uint8_t> &out) {
#ifdef _WIN32
  BCRYPT_ALG_HANDLE algorithm = nullptr;
  NTSTATUS status = BCryptOpenAlgorithmProvider(
      &algorithm, BCRYPT_SHA256_ALGORITHM, nullptr, BCRYPT_ALG_HANDLE_HMAC_FLAG);
  if (status != 0 || !algorithm) {
    return false;
  }

  out.assign(key_len, 0);
  status = BCryptDeriveKeyPBKDF2(
      algorithm, reinterpret_cast<PUCHAR>(const_cast<char *>(password.data())),
      static_cast<ULONG>(password.size()),
      reinterpret_cast<PUCHAR>(const_cast<uint8_t *>(salt.data())),
      static_cast<ULONG>(salt.size()), iterations, out.data(), static_cast<ULONG>(out.size()),
      0);

  BCryptCloseAlgorithmProvider(algorithm, 0);
  return status == 0;
#else
  out.assign(key_len, 0);
  if (iterations > static_cast<uint64_t>(std::numeric_limits<int>::max())) return false;
  return PKCS5_PBKDF2_HMAC(password.data(), static_cast<int>(password.size()),
                           salt.data(), static_cast<int>(salt.size()),
                           static_cast<int>(iterations), EVP_sha256(),
                           static_cast<int>(out.size()), out.data()) == 1;
#endif
}

std::optional<std::string> password_hash(const std::string &password) {
  auto salt = random_bytes(16);
  std::vector<uint8_t> digest;
  if (!pbkdf2_sha256(password, salt, 240000, 32, digest)) {
    return std::nullopt;
  }
  return base64_encode(salt) + "$" + base64_encode(digest);
}

bool password_matches(const std::string &password, const std::string &stored_hash) {
  const auto separator = stored_hash.find('$');
  if (separator == std::string::npos) return false;
  const auto salt_text = stored_hash.substr(0, separator);
  const auto digest_text = stored_hash.substr(separator + 1);
  auto salt = base64_decode(salt_text);
  auto expected = base64_decode(digest_text);
  if (!salt || !expected) return false;

  std::vector<uint8_t> actual;
  if (!pbkdf2_sha256(password, *salt, 240000, expected->size(), actual)) {
    return false;
  }
  return constant_time_equals(actual, *expected);
}

bool is_allowed_cors_origin(const std::string &origin);

void attach_security_headers(const httplib::Request &req, httplib::Response &res) {
  res.set_header("X-Content-Type-Options", "nosniff");
  res.set_header("X-Frame-Options", "DENY");
  res.set_header("Referrer-Policy", "same-origin");
  res.set_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.set_header(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' https: data:; media-src 'self' https:; "
      "style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; "
      "object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

  if (starts_with(req.path, "/api/")) {
    const auto origin = req.get_header_value("Origin");
    if (is_allowed_cors_origin(origin)) {
      res.set_header("Access-Control-Allow-Origin", origin);
      res.set_header("Access-Control-Allow-Credentials", "true");
      res.set_header("Vary", "Origin");
    }
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-XSRF-TOKEN");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
}

void send_json(const httplib::Request &req, httplib::Response &res, const json &payload,
               int status = 200) {
  attach_security_headers(req, res);
  res.status = status;
  res.set_content(payload.dump(), "application/json");
}

std::optional<json> parse_json_body(const httplib::Request &req, std::string &error_message,
                                    int &error_status) {
  if (req.body.size() > kMaxJsonBytes) {
    error_message = "Payload too large.";
    error_status = 413;
    return std::nullopt;
  }
  if (req.body.empty()) {
    return json::object();
  }
  try {
    auto body = json::parse(req.body);
    if (!body.is_object()) {
      error_message = "Invalid JSON";
      error_status = 400;
      return std::nullopt;
    }
    return body;
  } catch (...) {
    error_message = "Invalid JSON";
    error_status = 400;
    return std::nullopt;
  }
}

std::string html_escape(const std::string &value) {
  std::string out;
  out.reserve(value.size());
  for (char c : value) {
    switch (c) {
    case '&':
      out += "&amp;";
      break;
    case '<':
      out += "&lt;";
      break;
    case '>':
      out += "&gt;";
      break;
    case '"':
      out += "&quot;";
      break;
    case '\'':
      out += "&#039;";
      break;
    default:
      out.push_back(c);
      break;
    }
  }
  return out;
}

std::string strip_trailing_slashes(std::string value) {
  while (value.size() > 1 && value.back() == '/') value.pop_back();
  return value;
}

std::string origin_from_url(std::string url) {
  url = strip_trailing_slashes(trim_copy(url));
  const auto scheme = url.find("://");
  if (scheme == std::string::npos) return url;
  const auto path = url.find('/', scheme + 3);
  return path == std::string::npos ? url : url.substr(0, path);
}

std::vector<std::string> csv_values(const std::string &csv) {
  std::vector<std::string> values;
  size_t start = 0;
  while (start <= csv.size()) {
    const auto comma = csv.find(',', start);
    const std::string value =
        trim_copy(csv.substr(start, comma == std::string::npos ? std::string::npos : comma - start));
    if (!value.empty()) values.push_back(value);
    if (comma == std::string::npos) break;
    start = comma + 1;
  }
  return values;
}

bool is_allowed_cors_origin(const std::string &origin) {
  if (origin.empty()) return false;
  std::vector<std::string> allowed{
      "http://127.0.0.1:8000",
      "http://localhost:8000",
      "https://manidhsis-prog.github.io",
      "https://quash-ugtq.onrender.com",
  };

  const std::string app_url = env_string("PUBLIC_APP_URL", "");
  if (!app_url.empty()) allowed.push_back(origin_from_url(app_url));
  for (const auto &extra : csv_values(env_string("CORS_ORIGINS", ""))) {
    allowed.push_back(origin_from_url(extra));
  }
  return std::find(allowed.begin(), allowed.end(), strip_trailing_slashes(origin)) != allowed.end();
}

std::string app_base_url(const httplib::Request &req) {
  std::string proto = trim_copy(req.get_header_value("X-Forwarded-Proto"));
  if (proto.empty()) proto = "http";
  const auto comma = proto.find(',');
  if (comma != std::string::npos) proto = trim_copy(proto.substr(0, comma));

  std::string host = trim_copy(req.get_header_value("X-Forwarded-Host"));
  if (host.empty()) host = trim_copy(req.get_header_value("Host"));
  if (!host.empty()) return strip_trailing_slashes(proto + "://" + host);

  const std::string configured = env_string("PUBLIC_BASE_URL", "");
  if (!configured.empty()) return strip_trailing_slashes(configured);
  return "http://127.0.0.1:8000";
}

std::string frontend_base_url(const httplib::Request &req) {
  const std::string configured = env_string("PUBLIC_APP_URL", "");
  if (!configured.empty()) return strip_trailing_slashes(configured);
  const std::string forwarded_host = trim_copy(req.get_header_value("X-Forwarded-Host"));
  const std::string host = forwarded_host.empty() ? trim_copy(req.get_header_value("Host")) : forwarded_host;
  if (host.find(".onrender.com") != std::string::npos) {
    return "https://manidhsis-prog.github.io/Quash";
  }
  return app_base_url(req);
}

std::string oauth_redirect_uri(const httplib::Request &req, const std::string &provider) {
  return app_base_url(req) + "/api/auth/" + provider + "/callback";
}

void send_html_message(const httplib::Request &req, httplib::Response &res,
                       const std::string &title, const std::string &message,
                       int status = 200) {
  attach_security_headers(req, res);
  res.status = status;
  const std::string body =
      "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
      "<title>" + html_escape(title) + "</title>"
      "<style>body{margin:0;font-family:Arial,sans-serif;background:#f5f8fb;color:#10202e;}"
      ".wrap{min-height:100vh;display:grid;place-items:center;padding:24px;}"
      ".box{max-width:560px;background:white;border:1px solid #d8e2ec;border-radius:12px;"
      "padding:28px;box-shadow:0 18px 45px rgba(12,32,48,.12)}"
      "h1{font-size:24px;margin:0 0 12px}p{font-size:16px;line-height:1.5;margin:0 0 20px}"
      "a{display:inline-block;background:#008c95;color:white;text-decoration:none;padding:12px 18px;"
      "border-radius:8px;font-weight:700}</style></head><body><main class=\"wrap\"><section class=\"box\">"
      "<h1>" + html_escape(title) + "</h1><p>" + html_escape(message) + "</p>"
      "<a href=\"" + html_escape(frontend_base_url(req)) +
      "/index.html\">Back to Quash</a></section></main></body></html>";
  res.set_content(body, "text/html; charset=utf-8");
}

void redirect_to(const httplib::Request &req, httplib::Response &res, const std::string &url) {
  attach_security_headers(req, res);
  res.status = 302;
  res.set_header("Location", url);
  res.set_content("Redirecting", "text/plain");
}

std::optional<json> provider_json_result(const httplib::Result &result,
                                         const std::string &provider,
                                         std::string &error) {
  if (!result) {
    error = provider + " could not be reached. Please try again.";
    return std::nullopt;
  }

  json parsed = json::object();
  if (!result->body.empty()) {
    try {
      parsed = json::parse(result->body);
    } catch (...) {
      error = provider + " returned a response Quash could not read.";
      return std::nullopt;
    }
  }

  if (result->status < 200 || result->status >= 300) {
    error = parsed.value("error_description", parsed.value("error", provider + " sign-in failed."));
    if (error.empty()) error = provider + " sign-in failed.";
    return std::nullopt;
  }
  return parsed;
}

void redirect_oauth_success(const httplib::Request &req, httplib::Response &res,
                            const json &session) {
  const std::string payload = base64url_encode_string(session.dump());
  redirect_to(req, res, frontend_base_url(req) + "/index.html#oauth-" + payload);
}

std::optional<std::string> upload_extension_for_content_type(const std::string &content_type) {
  const std::string type = lower_copy(trim_copy(content_type));
  if (type == "image/jpeg" || type == "image/jpg") return ".jpg";
  if (type == "image/png") return ".png";
  if (type == "image/webp") return ".webp";
  if (type == "image/gif") return ".gif";
  if (type == "video/mp4") return ".mp4";
  if (type == "video/webm") return ".webm";
  if (type == "video/ogg") return ".ogv";
  if (type == "video/quicktime") return ".mov";
  return std::nullopt;
}

bool write_binary_file(const fs::path &file_path, const std::string &content) {
  std::ofstream stream(file_path, std::ios::binary | std::ios::trunc);
  if (!stream.good()) return false;
  stream.write(content.data(), static_cast<std::streamsize>(content.size()));
  return stream.good();
}

class QuashStore {
public:
  explicit QuashStore(fs::path data_dir)
      : data_dir_(std::move(data_dir)),
        db_file_(data_dir_ / "quash_cpp.json") {
    load_or_init();
  }

  bool allow_rate(const std::string &scope, const std::string &fingerprint) {
    const auto it = kRateLimits.find(scope);
    if (it == kRateLimits.end()) return true;

    const auto now = unix_now();
    const size_t limit = it->second.first;
    const int64_t window = it->second.second;
    const auto key = scope + "|" + fingerprint;

    std::lock_guard<std::mutex> lock(rate_mutex_);
    auto &attempts = rate_state_[key];
    while (!attempts.empty() && attempts.front() <= now - window) {
      attempts.pop_front();
    }
    if (attempts.size() >= limit) {
      return false;
    }
    attempts.push_back(now);
    return true;
  }

  std::optional<json> current_user_from_token(const std::string &token) {
    if (token.empty()) return std::nullopt;
    std::lock_guard<std::mutex> lock(mutex_);
    cleanup_expired_sessions_unlocked(unix_now());
    auto maybe_session = find_session_unlocked(token);
    if (!maybe_session) return std::nullopt;
    const int user_id = (*maybe_session)->value("userId", 0);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_user) return std::nullopt;
    return **maybe_user;
  }

  std::optional<json> register_user(const std::string &full_name, const std::string &username,
                                    const std::string &email, const std::string &phone,
                                    const std::string &password, const std::string &bio,
                                    std::string &error, int &status) {
    auto hash = password_hash(password);
    if (!hash) {
      error = "Password hashing is unavailable on this runtime.";
      status = 500;
      return std::nullopt;
    }

    std::lock_guard<std::mutex> lock(mutex_);
    cleanup_expired_sessions_unlocked(unix_now());

    const auto email_lower = lower_copy(trim_copy(email));
    const std::string final_full_name =
        trim_copy(full_name).empty() ? oauth_display_name(email_lower, "email") : trim_copy(full_name);
    const std::string final_phone = normalize_phone_number(phone);
    std::string final_username = trim_copy(username);
    if (final_username.empty()) {
      final_username = unique_username_unlocked(oauth_username_seed(email_lower, final_full_name, "email"));
    }
    for (const auto &user : db_["users"]) {
      if (lower_copy(user.value("username", "")) == lower_copy(final_username) ||
          lower_copy(user.value("email", "")) == email_lower ||
          (!final_phone.empty() && user.value("phone", "") == final_phone)) {
        error = "That username, email, or phone number is already registered.";
        status = 409;
        return std::nullopt;
      }
    }

    const int64_t now = unix_now();
    const int user_id = next_id_unlocked("user");
    json user{
        {"id", user_id},
        {"fullName", final_full_name},
        {"username", final_username},
        {"email", email_lower},
        {"phone", final_phone},
        {"passwordHash", *hash},
        {"bio", bio},
        {"avatarUrl", ""},
        {"googleId", ""},
        {"facebookId", ""},
        {"authProvider", "password"},
        {"createdAt", now},
    };
    db_["users"].push_back(user);

    const std::string token = generate_token();
    db_["sessions"].push_back(
        {{"token", token},
         {"userId", user_id},
         {"createdAt", now},
         {"expiresAt", now + kSessionTtlSeconds}});
    save_unlocked();

    return json{
        {"token", token},
        {"user", public_user_unlocked(user, true)},
    };
  }

  std::optional<json> login_user(const std::string &identifier, const std::string &password,
                                 std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    cleanup_expired_sessions_unlocked(unix_now());

    const auto needle = lower_copy(identifier);
    const auto phone_needle = normalize_phone_number(identifier);
    json *user_ptr = nullptr;
    for (auto &user : db_["users"]) {
      if (lower_copy(user.value("email", "")) == needle ||
          lower_copy(user.value("username", "")) == needle ||
          (!phone_needle.empty() && user.value("phone", "") == phone_needle)) {
        user_ptr = &user;
        break;
      }
    }

    if (!user_ptr || !password_matches(password, user_ptr->value("passwordHash", ""))) {
      error = "Email, username, phone, or password is incorrect.";
      status = 401;
      return std::nullopt;
    }

    const int64_t now = unix_now();
    const std::string token = generate_token();
    db_["sessions"].push_back(
        {{"token", token},
         {"userId", user_ptr->value("id", 0)},
         {"createdAt", now},
         {"expiresAt", now + kSessionTtlSeconds}});
    save_unlocked();

    return json{
        {"token", token},
        {"user", public_user_unlocked(*user_ptr, true)},
    };
  }

  std::string create_oauth_state(const std::string &provider) {
    std::lock_guard<std::mutex> lock(mutex_);
    const int64_t now = unix_now();
    cleanup_expired_oauth_states_unlocked(now);
    const std::string state = generate_token();
    db_["oauthStates"].push_back(
        {{"provider", provider},
         {"state", state},
         {"createdAt", now},
         {"expiresAt", now + kOAuthStateTtlSeconds}});
    save_unlocked();
    return state;
  }

  bool consume_oauth_state(const std::string &provider, const std::string &state) {
    if (state.empty()) return false;
    std::lock_guard<std::mutex> lock(mutex_);
    cleanup_expired_oauth_states_unlocked(unix_now());
    auto &states = db_["oauthStates"];
    for (auto it = states.begin(); it != states.end(); ++it) {
      if (it->value("provider", "") == provider && it->value("state", "") == state) {
        states.erase(it);
        save_unlocked();
        return true;
      }
    }
    save_unlocked();
    return false;
  }

  std::optional<json> login_oauth_user(const std::string &provider,
                                       const std::string &provider_id,
                                       const std::string &email,
                                       const std::string &full_name,
                                       const std::string &avatar_url,
                                       std::string &error, int &status) {
    const std::string provider_field =
        provider == "facebook" ? "facebookId" : provider == "google" ? "googleId" : "";
    if (provider_field.empty() || provider_id.empty()) {
      error = "Social sign-in did not return a valid account id.";
      status = 400;
      return std::nullopt;
    }

    std::lock_guard<std::mutex> lock(mutex_);
    const int64_t now = unix_now();
    cleanup_expired_sessions_unlocked(now);

    const std::string email_lower = lower_copy(trim_copy(email));
    const std::string name =
        trim_copy(full_name).empty() ? oauth_display_name(email_lower, provider) : trim_copy(full_name);
    json *user_ptr = nullptr;

    for (auto &user : db_["users"]) {
      if (user.value(provider_field, "") == provider_id) {
        user_ptr = &user;
        break;
      }
    }

    if (!user_ptr && !email_lower.empty()) {
      for (auto &user : db_["users"]) {
        if (lower_copy(user.value("email", "")) == email_lower) {
          user_ptr = &user;
          break;
        }
      }
    }

    if (user_ptr) {
      (*user_ptr)[provider_field] = provider_id;
      (*user_ptr)["authProvider"] = provider;
      if (!email_lower.empty() && user_ptr->value("email", "").empty()) {
        (*user_ptr)["email"] = email_lower;
      }
      if (!name.empty() && user_ptr->value("fullName", "").empty()) {
        (*user_ptr)["fullName"] = name;
      }
      if (!avatar_url.empty() && user_ptr->value("avatarUrl", "").empty()) {
        (*user_ptr)["avatarUrl"] = avatar_url;
      }
    } else {
      const int user_id = next_id_unlocked("user");
      json user{
          {"id", user_id},
          {"fullName", name},
          {"username", unique_username_unlocked(oauth_username_seed(email_lower, name, provider_id))},
          {"email", email_lower},
          {"phone", ""},
          {"passwordHash", ""},
          {"bio", "Connecting with the world on Quash."},
          {"avatarUrl", avatar_url},
          {"authProvider", provider},
          {"googleId", provider == "google" ? provider_id : ""},
          {"facebookId", provider == "facebook" ? provider_id : ""},
          {"createdAt", now},
      };
      db_["users"].push_back(user);
      user_ptr = &db_["users"].back();
    }

    const std::string token = generate_token();
    db_["sessions"].push_back(
        {{"token", token},
         {"userId", user_ptr->value("id", 0)},
         {"createdAt", now},
         {"expiresAt", now + kSessionTtlSeconds}});
    save_unlocked();

    return json{
        {"token", token},
        {"user", public_user_unlocked(*user_ptr, true)},
    };
  }

  void logout_token(const std::string &token) {
    if (token.empty()) return;
    std::lock_guard<std::mutex> lock(mutex_);
    auto &sessions = db_["sessions"];
    sessions.erase(std::remove_if(sessions.begin(), sessions.end(),
                                  [&](const json &session) {
                                    return session.value("token", "") == token;
                                  }),
                   sessions.end());
    save_unlocked();
  }

  std::optional<json> me(const std::string &token) {
    std::lock_guard<std::mutex> lock(mutex_);
    cleanup_expired_sessions_unlocked(unix_now());
    auto maybe_session = find_session_unlocked(token);
    if (!maybe_session) return std::nullopt;
    const int user_id = (*maybe_session)->value("userId", 0);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_user) return std::nullopt;
    return public_user_unlocked(**maybe_user, true);
  }

  json posts(std::optional<int> viewer_id, const std::string &search, const std::string &topic,
             std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<const json *> matched;
    const auto search_lower = lower_copy(search);
    const auto topic_tag = topic.empty() ? "" : "#" + lower_copy(topic);

    for (const auto &post : db_["posts"]) {
      bool ok = true;
      if (!search_lower.empty()) {
        const int author_id = post.value("userId", 0);
        auto maybe_author = find_user_unlocked(author_id);
        const std::string author_full_name =
            maybe_author ? (*maybe_author)->value("fullName", "") : "";
        const std::string author_username =
            maybe_author ? (*maybe_author)->value("username", "") : "";
        ok = contains_ignore_case(post.value("body", ""), search_lower) ||
             contains_ignore_case(post.value("postType", ""), search_lower) ||
             contains_ignore_case(author_full_name, search_lower) ||
             contains_ignore_case(author_username, search_lower);
      }
      if (ok && !topic_tag.empty()) {
        ok = contains_ignore_case(post.value("body", ""), topic_tag);
      }
      if (ok) {
        matched.push_back(&post);
      }
    }

    std::sort(matched.begin(), matched.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (matched.size() > 50) matched.resize(50);

    json out_posts = json::array();
    for (const auto *post : matched) {
      out_posts.push_back(public_post_unlocked(*post, viewer_id));
    }

    (void)error;
    (void)status;
    return json{{"posts", out_posts}};
  }

  std::optional<json> create_post(int user_id, const std::string &post_type, const std::string &body,
                                  const std::string &media_url,
                                  std::optional<int> duration_seconds, std::string &error,
                                  int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_user) {
      error = "Create an account or sign in before posting.";
      status = 401;
      return std::nullopt;
    }

    std::string normalized_type = post_type;
    if (!contains_value(kAllowedPostTypes, normalized_type)) {
      normalized_type = "Text";
    }
    if (duration_seconds && *duration_seconds > 0 &&
        *duration_seconds <= kShortReelMaxSeconds && normalized_type == "Video") {
      normalized_type = "Reel";
    }
    if (duration_seconds && *duration_seconds > kShortReelMaxSeconds &&
        normalized_type == "Reel") {
      error = "Reels can be 1:30 max. Trim this video or choose Video.";
      status = 400;
      return std::nullopt;
    }

    const int64_t now = unix_now();
    const int post_id = next_id_unlocked("post");
    json post{
        {"id", post_id},
        {"userId", user_id},
        {"postType", normalized_type},
        {"body", body},
        {"mediaUrl", media_url},
        {"createdAt", now},
    };
    if (duration_seconds && *duration_seconds > 0) {
      post["durationSeconds"] = *duration_seconds;
    }
    db_["posts"].push_back(post);

    const std::string username = (*maybe_user)->value("username", "");
    for (const auto &follow : db_["follows"]) {
      if (follow.value("followingId", 0) == user_id) {
        create_notification_unlocked(
            follow.value("followerId", 0), user_id, "post",
            "@" + username + " posted a new " + lower_copy(normalized_type) + " update.",
            post_id, std::nullopt, "");
      }
    }

    save_unlocked();
    return json{{"post", public_post_unlocked(post, user_id)}};
  }

  std::optional<json> my_activity(int user_id, std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_user) {
      error = "Sign in to view your profile activity.";
      status = 401;
      return std::nullopt;
    }

    std::vector<const json *> own_posts;
    for (const auto &post : db_["posts"]) {
      if (post.value("userId", 0) == user_id) {
        own_posts.push_back(&post);
      }
    }
    const int total_posts = static_cast<int>(own_posts.size());
    std::sort(own_posts.begin(), own_posts.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (own_posts.size() > 50) own_posts.resize(50);

    json posts_json = json::array();
    for (const auto *post : own_posts) {
      posts_json.push_back(public_post_unlocked(*post, user_id));
    }

    int followers = 0;
    int following = 0;
    for (const auto &follow : db_["follows"]) {
      if (follow.value("followingId", 0) == user_id) ++followers;
      if (follow.value("followerId", 0) == user_id) ++following;
    }

    json activity = json::array();
    activity.push_back(
        {{"label", "Account created"},
         {"detail", "@" + (*maybe_user)->value("username", "") + " joined Quash"},
         {"createdAt", (*maybe_user)->value("createdAt", 0LL)}});
    for (size_t i = 0; i < own_posts.size() && i < 8; ++i) {
      const auto &post = *own_posts[i];
      activity.push_back({{"label", post.value("postType", "") + " post"},
                          {"detail", post.value("body", "")},
                          {"createdAt", post.value("createdAt", 0LL)}});
    }

    return json{
        {"user", public_user_unlocked(**maybe_user, true)},
        {"posts", posts_json},
        {"activity", activity},
        {"stats", {{"posts", total_posts},
                   {"followers", followers},
                   {"following", following}}},
    };
  }

  std::optional<json> user_profile(int profile_user_id, std::optional<int> viewer_id,
                                   std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_user = find_user_unlocked(profile_user_id);
    if (!maybe_user) {
      error = "User not found.";
      status = 404;
      return std::nullopt;
    }

    std::vector<const json *> own_posts;
    for (const auto &post : db_["posts"]) {
      if (post.value("userId", 0) == profile_user_id) {
        own_posts.push_back(&post);
      }
    }
    const int total_posts = static_cast<int>(own_posts.size());
    std::sort(own_posts.begin(), own_posts.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (own_posts.size() > 50) own_posts.resize(50);

    json posts_json = json::array();
    for (const auto *post : own_posts) {
      posts_json.push_back(public_post_unlocked(*post, viewer_id));
    }

    int followers = 0;
    int following = 0;
    bool followed_by_viewer = false;
    for (const auto &follow : db_["follows"]) {
      if (follow.value("followingId", 0) == profile_user_id) {
        ++followers;
        if (viewer_id && follow.value("followerId", 0) == *viewer_id) {
          followed_by_viewer = true;
        }
      }
      if (follow.value("followerId", 0) == profile_user_id) ++following;
    }

    json public_user = public_user_unlocked(**maybe_user, false);
    public_user["followers"] = followers;
    public_user["following"] = followed_by_viewer;

    json activity = json::array();
    activity.push_back(
        {{"label", "Account created"},
         {"detail", "@" + (*maybe_user)->value("username", "") + " joined Quash"},
         {"createdAt", (*maybe_user)->value("createdAt", 0LL)}});
    for (size_t i = 0; i < own_posts.size() && i < 8; ++i) {
      const auto &post = *own_posts[i];
      activity.push_back({{"label", post.value("postType", "") + " post"},
                          {"detail", post.value("body", "")},
                          {"createdAt", post.value("createdAt", 0LL)}});
    }

    return json{
        {"user", public_user},
        {"posts", posts_json},
        {"activity", activity},
        {"stats", {{"posts", total_posts},
                   {"followers", followers},
                   {"following", following}}},
    };
  }

  std::optional<json> like_post(int user_id, int post_id, std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_post = find_post_unlocked(post_id);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_post || !maybe_user) {
      error = "Post not found.";
      status = 404;
      return std::nullopt;
    }

    bool existed = false;
    auto &likes = db_["likes"];
    for (auto it = likes.begin(); it != likes.end(); ++it) {
      if (it->value("postId", 0) == post_id && it->value("userId", 0) == user_id) {
        likes.erase(it);
        existed = true;
        break;
      }
    }

    bool liked = !existed;
    if (liked) {
      likes.push_back({{"postId", post_id}, {"userId", user_id}, {"createdAt", unix_now()}});
      create_notification_unlocked(
          (*maybe_post)->value("userId", 0), user_id, "like",
          "@" + (*maybe_user)->value("username", "") + " liked your post.", post_id,
          std::nullopt, "");
    }

    int count = 0;
    for (const auto &like : likes) {
      if (like.value("postId", 0) == post_id) ++count;
    }

    save_unlocked();
    return json{{"liked", liked}, {"likeCount", count}};
  }

  std::optional<json> create_comment(int user_id, int post_id, const std::string &body,
                                     std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_post = find_post_unlocked(post_id);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_post || !maybe_user) {
      error = "Post not found.";
      status = 404;
      return std::nullopt;
    }

    const int comment_id = next_id_unlocked("comment");
    json comment{
        {"id", comment_id},
        {"postId", post_id},
        {"userId", user_id},
        {"body", body},
        {"createdAt", unix_now()},
    };
    db_["comments"].push_back(comment);

    create_notification_unlocked(
        (*maybe_post)->value("userId", 0), user_id, "comment",
        "@" + (*maybe_user)->value("username", "") + " commented on your post.", post_id,
        comment_id, "");

    int count = 0;
    for (const auto &item : db_["comments"]) {
      if (item.value("postId", 0) == post_id) ++count;
    }

    save_unlocked();
    return json{{"comment", public_comment_unlocked(comment)}, {"commentCount", count}};
  }

  std::optional<json> share_post(int user_id, int post_id, std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_post = find_post_unlocked(post_id);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_post || !maybe_user) {
      error = "Post not found.";
      status = 404;
      return std::nullopt;
    }

    bool created = false;
    bool exists = false;
    for (const auto &share : db_["shares"]) {
      if (share.value("postId", 0) == post_id && share.value("userId", 0) == user_id) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      db_["shares"].push_back(
          {{"id", next_id_unlocked("share")},
           {"postId", post_id},
           {"userId", user_id},
           {"createdAt", unix_now()}});
      created = true;
      create_notification_unlocked(
          (*maybe_post)->value("userId", 0), user_id, "share",
          "@" + (*maybe_user)->value("username", "") + " shared your post.", post_id,
          std::nullopt, "");
      save_unlocked();
    }

    int count = 0;
    for (const auto &share : db_["shares"]) {
      if (share.value("postId", 0) == post_id) ++count;
    }

    return json{{"shareCount", count},
                {"shareUrl", "/index.html#post-" + std::to_string(post_id)},
                {"sharedByMe", true},
                {"created", created}};
  }

  std::optional<json> follow_user(int actor_id, int target_id, std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (actor_id == target_id) {
      error = "You are already yourself.";
      status = 400;
      return std::nullopt;
    }
    auto maybe_actor = find_user_unlocked(actor_id);
    auto maybe_target = find_user_unlocked(target_id);
    if (!maybe_actor || !maybe_target) {
      error = "User not found.";
      status = 404;
      return std::nullopt;
    }

    bool following = false;
    auto &follows = db_["follows"];
    auto existing = std::find_if(follows.begin(), follows.end(), [&](const json &follow) {
      return follow.value("followerId", 0) == actor_id &&
             follow.value("followingId", 0) == target_id;
    });
    if (existing != follows.end()) {
      follows.erase(existing);
      following = false;
    } else {
      follows.push_back(
          {{"followerId", actor_id}, {"followingId", target_id}, {"createdAt", unix_now()}});
      following = true;
      create_notification_unlocked(target_id, actor_id, "follow",
                                   "@" + (*maybe_actor)->value("username", "") +
                                       " followed you.",
                                   std::nullopt, std::nullopt, "");
    }

    int followers = 0;
    for (const auto &follow : follows) {
      if (follow.value("followingId", 0) == target_id) ++followers;
    }
    save_unlocked();
    return json{{"following", following}, {"followers", followers}};
  }

  std::optional<json> follow_topic(int user_id, const std::string &topic, std::string &error,
                                   int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_user = find_user_unlocked(user_id);
    if (!maybe_user) {
      error = "Sign in before following topics.";
      status = 401;
      return std::nullopt;
    }

    auto &topic_follows = db_["topicFollows"];
    bool following = false;
    auto existing =
        std::find_if(topic_follows.begin(), topic_follows.end(), [&](const json &item) {
          return item.value("userId", 0) == user_id && item.value("topic", "") == topic;
        });
    if (existing != topic_follows.end()) {
      topic_follows.erase(existing);
      following = false;
    } else {
      topic_follows.push_back(
          {{"userId", user_id}, {"topic", topic}, {"createdAt", unix_now()}});
      following = true;
    }

    int followers = 0;
    for (const auto &item : topic_follows) {
      if (item.value("topic", "") == topic) ++followers;
    }
    save_unlocked();
    return json{{"topic", topic}, {"following", following}, {"followers", followers}};
  }

  json topic(const std::string &topic, std::optional<int> viewer_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    const std::string hashtag = "#" + lower_copy(topic);

    std::vector<const json *> rows;
    for (const auto &post : db_["posts"]) {
      if (contains_ignore_case(post.value("body", ""), hashtag)) {
        rows.push_back(&post);
      }
    }
    std::sort(rows.begin(), rows.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (rows.size() > 50) rows.resize(50);

    bool following = false;
    if (viewer_id) {
      for (const auto &item : db_["topicFollows"]) {
        if (item.value("userId", 0) == *viewer_id && item.value("topic", "") == topic) {
          following = true;
          break;
        }
      }
    }

    int followers = 0;
    for (const auto &item : db_["topicFollows"]) {
      if (item.value("topic", "") == topic) ++followers;
    }

    json posts_json = json::array();
    for (const auto *post : rows) {
      posts_json.push_back(public_post_unlocked(*post, viewer_id));
    }
    return json{{"topic", topic},
                {"following", following},
                {"followers", followers},
                {"posts", posts_json}};
  }

  json notifications(int user_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<const json *> list;
    int unread = 0;
    for (const auto &item : db_["notifications"]) {
      if (item.value("userId", 0) == user_id) {
        list.push_back(&item);
        if (!item.value("isRead", false)) ++unread;
      }
    }
    std::sort(list.begin(), list.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (list.size() > 40) list.resize(40);

    json out = json::array();
    for (const auto *item : list) {
      out.push_back(public_notification_unlocked(*item));
    }
    return json{{"notifications", out}, {"unreadCount", unread}};
  }

  std::optional<json> conversations(int user_id, std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!find_user_unlocked(user_id)) {
      error = "Sign in to view messages.";
      status = 401;
      return std::nullopt;
    }

    std::unordered_map<int, json> last_by_partner;
    std::unordered_map<int, int> unread_by_partner;
    for (const auto &message : db_["messages"]) {
      const int sender_id = message.value("senderId", 0);
      const int recipient_id = message.value("recipientId", 0);
      int partner_id = 0;
      if (sender_id == user_id) {
        partner_id = recipient_id;
      } else if (recipient_id == user_id) {
        partner_id = sender_id;
        if (!message.value("isRead", false)) {
          ++unread_by_partner[partner_id];
        }
      }
      if (partner_id <= 0 || !find_user_unlocked(partner_id)) continue;

      auto existing = last_by_partner.find(partner_id);
      if (existing == last_by_partner.end() ||
          message.value("createdAt", 0LL) > existing->second.value("createdAt", 0LL)) {
        last_by_partner[partner_id] = message;
      }
    }

    std::vector<int> partner_ids;
    partner_ids.reserve(last_by_partner.size());
    for (const auto &item : last_by_partner) {
      partner_ids.push_back(item.first);
    }
    std::sort(partner_ids.begin(), partner_ids.end(), [&](int a, int b) {
      return last_by_partner[a].value("createdAt", 0LL) >
             last_by_partner[b].value("createdAt", 0LL);
    });

    json conversation_rows = json::array();
    for (int partner_id : partner_ids) {
      auto maybe_user = find_user_unlocked(partner_id);
      if (!maybe_user) continue;
      conversation_rows.push_back(
          {{"user", public_user_unlocked(**maybe_user, false)},
           {"lastMessage", public_message_unlocked(last_by_partner[partner_id], user_id)},
           {"unreadCount", unread_by_partner[partner_id]}});
    }

    std::vector<const json *> contact_users;
    for (const auto &user : db_["users"]) {
      const int contact_id = user.value("id", 0);
      if (contact_id <= 0 || contact_id == user_id) continue;
      contact_users.push_back(&user);
    }
    std::sort(contact_users.begin(), contact_users.end(), [&](const json *a, const json *b) {
      const bool a_following = is_following_unlocked(user_id, a->value("id", 0));
      const bool b_following = is_following_unlocked(user_id, b->value("id", 0));
      if (a_following != b_following) return a_following > b_following;
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (contact_users.size() > 40) contact_users.resize(40);

    json contact_rows = json::array();
    for (const auto *user : contact_users) {
      const int contact_id = user->value("id", 0);
      auto public_user = public_user_unlocked(*user, false);
      public_user["following"] = is_following_unlocked(user_id, contact_id);
      public_user["followers"] = follower_count_unlocked(contact_id);
      contact_rows.push_back(std::move(public_user));
    }

    return json{{"conversations", conversation_rows}, {"contacts", contact_rows}};
  }

  std::optional<json> conversation(int user_id, int other_id, std::string &error,
                                   int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_current = find_user_unlocked(user_id);
    auto maybe_other = find_user_unlocked(other_id);
    if (!maybe_current) {
      error = "Sign in to view messages.";
      status = 401;
      return std::nullopt;
    }
    if (!maybe_other || other_id == user_id) {
      error = "User not found.";
      status = 404;
      return std::nullopt;
    }

    bool changed = false;
    std::vector<json *> rows;
    for (auto &message : db_["messages"]) {
      const int sender_id = message.value("senderId", 0);
      const int recipient_id = message.value("recipientId", 0);
      const bool in_thread =
          (sender_id == user_id && recipient_id == other_id) ||
          (sender_id == other_id && recipient_id == user_id);
      if (!in_thread) continue;
      if (recipient_id == user_id && !message.value("isRead", false)) {
        message["isRead"] = true;
        changed = true;
      }
      rows.push_back(&message);
    }
    std::sort(rows.begin(), rows.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) < b->value("createdAt", 0LL);
    });
    if (rows.size() > 80) {
      rows.erase(rows.begin(), rows.end() - 80);
    }

    json message_rows = json::array();
    for (const auto *message : rows) {
      message_rows.push_back(public_message_unlocked(*message, user_id));
    }
    if (changed) save_unlocked();

    auto public_other = public_user_unlocked(**maybe_other, false);
    public_other["following"] = is_following_unlocked(user_id, other_id);
    public_other["followers"] = follower_count_unlocked(other_id);
    return json{{"user", public_other}, {"messages", message_rows}};
  }

  std::optional<json> create_message(int sender_id, int recipient_id, const std::string &body,
                                     std::string &error, int &status) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto maybe_sender = find_user_unlocked(sender_id);
    auto maybe_recipient = find_user_unlocked(recipient_id);
    if (!maybe_sender) {
      error = "Sign in before sending messages.";
      status = 401;
      return std::nullopt;
    }
    if (!maybe_recipient || sender_id == recipient_id) {
      error = "User not found.";
      status = 404;
      return std::nullopt;
    }

    const int message_id = next_id_unlocked("message");
    json message{
        {"id", message_id},
        {"senderId", sender_id},
        {"recipientId", recipient_id},
        {"body", body},
        {"isRead", false},
        {"createdAt", unix_now()},
    };
    db_["messages"].push_back(message);

    create_notification_unlocked(
        recipient_id, sender_id, "message",
        "@" + (*maybe_sender)->value("username", "") + " sent you a message.",
        std::nullopt, std::nullopt, "");

    save_unlocked();
    return json{{"message", public_message_unlocked(message, sender_id)}};
  }

  void mark_notifications_read(int user_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    for (auto &item : db_["notifications"]) {
      if (item.value("userId", 0) == user_id) {
        item["isRead"] = true;
      }
    }
    save_unlocked();
  }

  json search(std::optional<int> viewer_id, const std::string &query) {
    std::lock_guard<std::mutex> lock(mutex_);
    const std::string needle = lower_copy(query);
    json posts_json = json::array();
    json users_json = json::array();

    std::vector<const json *> post_rows;
    for (const auto &post : db_["posts"]) {
      if (contains_ignore_case(post.value("body", ""), needle) ||
          contains_ignore_case(post.value("postType", ""), needle)) {
        post_rows.push_back(&post);
      }
    }
    std::sort(post_rows.begin(), post_rows.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (post_rows.size() > 25) post_rows.resize(25);
    for (const auto *post : post_rows) {
      posts_json.push_back(public_post_unlocked(*post, viewer_id));
    }

    std::vector<const json *> user_rows;
    for (const auto &user : db_["users"]) {
      if (contains_ignore_case(user.value("fullName", ""), needle) ||
          contains_ignore_case(user.value("username", ""), needle)) {
        user_rows.push_back(&user);
      }
    }
    std::sort(user_rows.begin(), user_rows.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) > b->value("createdAt", 0LL);
    });
    if (user_rows.size() > 15) user_rows.resize(15);

    for (const auto *user : user_rows) {
      bool following = false;
      if (viewer_id) {
        for (const auto &follow : db_["follows"]) {
          if (follow.value("followerId", 0) == *viewer_id &&
              follow.value("followingId", 0) == user->value("id", 0)) {
            following = true;
            break;
          }
        }
      }
      int followers = 0;
      for (const auto &follow : db_["follows"]) {
        if (follow.value("followingId", 0) == user->value("id", 0)) ++followers;
      }
      auto user_data = public_user_unlocked(*user, false);
      user_data["following"] = following;
      user_data["followers"] = followers;
      users_json.push_back(std::move(user_data));
    }

    return json{{"posts", posts_json}, {"users", users_json}};
  }

private:
  fs::path data_dir_;
  fs::path db_file_;
  json db_;
  std::mutex mutex_;

  std::mutex rate_mutex_;
  std::unordered_map<std::string, std::deque<int64_t>> rate_state_;

  void load_or_init() {
    std::error_code ec;
    fs::create_directories(data_dir_, ec);

    if (fs::exists(db_file_)) {
      std::ifstream input(db_file_);
      try {
        input >> db_;
      } catch (...) {
        db_ = json::object();
      }
    }
    if (!db_.is_object()) {
      db_ = json::object();
    }
    ensure_schema_unlocked();
    save_unlocked();
  }

  void ensure_schema_unlocked() {
    if (!db_.contains("nextIds") || !db_["nextIds"].is_object()) {
      db_["nextIds"] = json::object();
    }
    auto &next_ids = db_["nextIds"];
    if (!next_ids.contains("user")) next_ids["user"] = 1;
    if (!next_ids.contains("post")) next_ids["post"] = 1;
    if (!next_ids.contains("comment")) next_ids["comment"] = 1;
    if (!next_ids.contains("share")) next_ids["share"] = 1;
    if (!next_ids.contains("message")) next_ids["message"] = 1;
    if (!next_ids.contains("notification")) next_ids["notification"] = 1;

    if (!db_.contains("users") || !db_["users"].is_array()) db_["users"] = json::array();
    if (!db_.contains("sessions") || !db_["sessions"].is_array()) db_["sessions"] = json::array();
    if (!db_.contains("oauthStates") || !db_["oauthStates"].is_array()) {
      db_["oauthStates"] = json::array();
    }
    if (!db_.contains("posts") || !db_["posts"].is_array()) db_["posts"] = json::array();
    if (!db_.contains("comments") || !db_["comments"].is_array()) db_["comments"] = json::array();
    if (!db_.contains("likes") || !db_["likes"].is_array()) db_["likes"] = json::array();
    if (!db_.contains("shares") || !db_["shares"].is_array()) db_["shares"] = json::array();
    if (!db_.contains("messages") || !db_["messages"].is_array()) db_["messages"] = json::array();
    if (!db_.contains("follows") || !db_["follows"].is_array()) db_["follows"] = json::array();
    if (!db_.contains("topicFollows") || !db_["topicFollows"].is_array()) {
      db_["topicFollows"] = json::array();
    }
    if (!db_.contains("notifications") || !db_["notifications"].is_array()) {
      db_["notifications"] = json::array();
    }
    for (auto &user : db_["users"]) {
      if (!user.contains("phone")) user["phone"] = "";
      if (!user.contains("googleId")) user["googleId"] = "";
      if (!user.contains("facebookId")) user["facebookId"] = "";
      if (!user.contains("authProvider")) user["authProvider"] = "password";
    }
  }

  void save_unlocked() {
    std::ofstream output(db_file_, std::ios::trunc);
    output << db_.dump(2);
  }

  int next_id_unlocked(const std::string &name) {
    int value = db_["nextIds"].value(name, 1);
    db_["nextIds"][name] = value + 1;
    return value;
  }

  static std::string generate_token() {
    return base64url_encode(random_bytes(32));
  }

  static std::string oauth_display_name(const std::string &email,
                                        const std::string &provider) {
    if (!email.empty()) {
      const auto at = email.find('@');
      std::string name = at == std::string::npos ? email : email.substr(0, at);
      for (auto &c : name) {
        if (c == '.' || c == '_' || c == '-') c = ' ';
      }
      if (!trim_copy(name).empty()) return trim_copy(name);
    }
    return provider == "facebook" ? "Facebook User" : "Google User";
  }

  static std::string oauth_username_seed(const std::string &email,
                                         const std::string &full_name,
                                         const std::string &provider_id) {
    std::string source;
    if (!email.empty()) {
      const auto at = email.find('@');
      source = at == std::string::npos ? email : email.substr(0, at);
    } else if (!full_name.empty()) {
      source = full_name;
    } else {
      source = "quash_" + provider_id;
    }

    std::string seed;
    bool last_underscore = false;
    for (unsigned char c : source) {
      if (std::isalnum(c)) {
        seed.push_back(static_cast<char>(std::tolower(c)));
        last_underscore = false;
      } else if (!last_underscore) {
        seed.push_back('_');
        last_underscore = true;
      }
      if (seed.size() >= 24) break;
    }
    while (!seed.empty() && seed.front() == '_') seed.erase(seed.begin());
    while (!seed.empty() && seed.back() == '_') seed.pop_back();
    if (seed.size() < 3) seed = "quash_user";
    return seed;
  }

  bool username_taken_unlocked(const std::string &username) {
    const std::string needle = lower_copy(username);
    for (const auto &user : db_["users"]) {
      if (lower_copy(user.value("username", "")) == needle) return true;
    }
    return false;
  }

  std::string unique_username_unlocked(const std::string &seed) {
    std::string root = seed.empty() ? "quash_user" : seed;
    if (root.size() > 24) root.resize(24);
    if (std::regex_match(root, kUsernameRe) && !username_taken_unlocked(root)) {
      return root;
    }

    for (int suffix = 2; suffix < 100000; ++suffix) {
      const std::string suffix_text = "_" + std::to_string(suffix);
      std::string candidate_root = root;
      if (candidate_root.size() + suffix_text.size() > 32) {
        candidate_root.resize(32 - suffix_text.size());
      }
      const std::string candidate = candidate_root + suffix_text;
      if (std::regex_match(candidate, kUsernameRe) && !username_taken_unlocked(candidate)) {
        return candidate;
      }
    }
    return "quash_" + std::to_string(next_id_unlocked("user"));
  }

  void cleanup_expired_sessions_unlocked(int64_t now) {
    auto &sessions = db_["sessions"];
    sessions.erase(std::remove_if(sessions.begin(), sessions.end(),
                                  [&](const json &session) {
                                    return session.value("expiresAt", 0LL) <= now;
                                  }),
                   sessions.end());
  }

  void cleanup_expired_oauth_states_unlocked(int64_t now) {
    auto &states = db_["oauthStates"];
    states.erase(std::remove_if(states.begin(), states.end(),
                                [&](const json &state) {
                                  return state.value("expiresAt", 0LL) <= now;
                                }),
                 states.end());
  }

  std::optional<json *> find_user_unlocked(int user_id) {
    for (auto &user : db_["users"]) {
      if (user.value("id", 0) == user_id) {
        return &user;
      }
    }
    return std::nullopt;
  }

  std::optional<json *> find_post_unlocked(int post_id) {
    for (auto &post : db_["posts"]) {
      if (post.value("id", 0) == post_id) {
        return &post;
      }
    }
    return std::nullopt;
  }

  std::optional<json *> find_session_unlocked(const std::string &token) {
    for (auto &session : db_["sessions"]) {
      if (session.value("token", "") == token &&
          session.value("expiresAt", 0LL) > unix_now()) {
        return &session;
      }
    }
    return std::nullopt;
  }

  bool is_following_unlocked(int follower_id, int following_id) {
    for (const auto &follow : db_["follows"]) {
      if (follow.value("followerId", 0) == follower_id &&
          follow.value("followingId", 0) == following_id) {
        return true;
      }
    }
    return false;
  }

  int follower_count_unlocked(int user_id) {
    int followers = 0;
    for (const auto &follow : db_["follows"]) {
      if (follow.value("followingId", 0) == user_id) ++followers;
    }
    return followers;
  }

  json public_user_unlocked(const json &user, bool include_email) {
    json out{
        {"id", user.value("id", 0)},
        {"fullName", user.value("fullName", "")},
        {"username", user.value("username", "")},
        {"bio", user.value("bio", "")},
        {"avatarUrl", user.value("avatarUrl", "")},
        {"createdAt", user.value("createdAt", 0LL)},
    };
    if (include_email) {
      out["email"] = user.value("email", "");
      out["phone"] = user.value("phone", "");
    }
    return out;
  }

  json public_comment_unlocked(const json &comment) {
    const int user_id = comment.value("userId", 0);
    auto maybe_user = find_user_unlocked(user_id);
    json author{
        {"id", user_id},
        {"fullName", maybe_user ? (*maybe_user)->value("fullName", "") : ""},
        {"username", maybe_user ? (*maybe_user)->value("username", "") : ""},
        {"avatarUrl", maybe_user ? (*maybe_user)->value("avatarUrl", "") : ""},
    };
    return json{
        {"id", comment.value("id", 0)},
        {"postId", comment.value("postId", 0)},
        {"body", comment.value("body", "")},
        {"createdAt", comment.value("createdAt", 0LL)},
        {"author", author},
    };
  }

  json public_message_unlocked(const json &message, int viewer_id) {
    const int sender_id = message.value("senderId", 0);
    auto maybe_sender = find_user_unlocked(sender_id);
    json sender{
        {"id", sender_id},
        {"fullName", maybe_sender ? (*maybe_sender)->value("fullName", "") : ""},
        {"username", maybe_sender ? (*maybe_sender)->value("username", "") : ""},
        {"avatarUrl", maybe_sender ? (*maybe_sender)->value("avatarUrl", "") : ""},
    };
    return json{
        {"id", message.value("id", 0)},
        {"senderId", sender_id},
        {"recipientId", message.value("recipientId", 0)},
        {"body", message.value("body", "")},
        {"isRead", message.value("isRead", false)},
        {"mine", sender_id == viewer_id},
        {"createdAt", message.value("createdAt", 0LL)},
        {"sender", sender},
    };
  }

  json public_post_unlocked(const json &post, std::optional<int> viewer_id) {
    const int post_id = post.value("id", 0);
    const int author_id = post.value("userId", 0);

    int like_count = 0;
    int comment_count = 0;
    int share_count = 0;
    bool liked_by_me = false;
    bool shared_by_me = false;
    bool following_author = false;

    for (const auto &like : db_["likes"]) {
      if (like.value("postId", 0) == post_id) {
        ++like_count;
        if (viewer_id && like.value("userId", 0) == *viewer_id) liked_by_me = true;
      }
    }

    std::vector<const json *> comments;
    for (const auto &comment : db_["comments"]) {
      if (comment.value("postId", 0) == post_id) {
        ++comment_count;
        comments.push_back(&comment);
      }
    }
    std::sort(comments.begin(), comments.end(), [](const json *a, const json *b) {
      return a->value("createdAt", 0LL) < b->value("createdAt", 0LL);
    });
    if (comments.size() > 25) comments.resize(25);

    for (const auto &share : db_["shares"]) {
      if (share.value("postId", 0) == post_id) {
        ++share_count;
        if (viewer_id && share.value("userId", 0) == *viewer_id) shared_by_me = true;
      }
    }

    if (viewer_id) {
      for (const auto &follow : db_["follows"]) {
        if (follow.value("followerId", 0) == *viewer_id &&
            follow.value("followingId", 0) == author_id) {
          following_author = true;
          break;
        }
      }
    }

    auto maybe_author = find_user_unlocked(author_id);
    json author{
        {"id", author_id},
        {"fullName", maybe_author ? (*maybe_author)->value("fullName", "") : ""},
        {"username", maybe_author ? (*maybe_author)->value("username", "") : ""},
        {"avatarUrl", maybe_author ? (*maybe_author)->value("avatarUrl", "") : ""},
        {"following", following_author},
    };

    json public_comments = json::array();
    for (const auto *comment : comments) {
      public_comments.push_back(public_comment_unlocked(*comment));
    }

    return json{
        {"id", post_id},
        {"postType", post.value("postType", "Text")},
        {"body", post.value("body", "")},
        {"mediaUrl", post.value("mediaUrl", "")},
        {"durationSeconds", post.value("durationSeconds", 0)},
        {"createdAt", post.value("createdAt", 0LL)},
        {"likeCount", like_count},
        {"commentCount", comment_count},
        {"shareCount", share_count},
        {"likedByMe", liked_by_me},
        {"sharedByMe", shared_by_me},
        {"comments", public_comments},
        {"author", author},
    };
  }

  json public_notification_unlocked(const json &notification) {
    json actor = nullptr;
    const int actor_id = notification.value("actorId", 0);
    if (actor_id > 0) {
      auto maybe_actor = find_user_unlocked(actor_id);
      if (maybe_actor) {
        actor = {{"id", actor_id},
                 {"fullName", (*maybe_actor)->value("fullName", "")},
                 {"username", (*maybe_actor)->value("username", "")},
                 {"avatarUrl", (*maybe_actor)->value("avatarUrl", "")}};
      }
    }
    return json{
        {"id", notification.value("id", 0)},
        {"type", notification.value("type", "")},
        {"postId", notification.value("postId", 0)},
        {"commentId", notification.value("commentId", 0)},
        {"topic", notification.value("topic", "")},
        {"message", notification.value("message", "")},
        {"isRead", notification.value("isRead", false)},
        {"createdAt", notification.value("createdAt", 0LL)},
        {"actor", actor},
    };
  }

  void create_notification_unlocked(int user_id, int actor_id, const std::string &type,
                                    const std::string &message, std::optional<int> post_id,
                                    std::optional<int> comment_id, const std::string &topic) {
    if (user_id <= 0 || actor_id <= 0 || user_id == actor_id) return;
    if (!find_user_unlocked(user_id).has_value()) return;

    db_["notifications"].push_back(
        {{"id", next_id_unlocked("notification")},
         {"userId", user_id},
         {"actorId", actor_id},
         {"type", type},
         {"postId", post_id.value_or(0)},
         {"commentId", comment_id.value_or(0)},
         {"topic", topic},
         {"message", message},
         {"isRead", false},
         {"createdAt", unix_now()}});
  }
};

std::string bearer_token(const httplib::Request &req) {
  const auto auth = req.get_header_value("Authorization");
  if (!starts_with(auth, "Bearer ")) return "";
  auto token = trim_copy(auth.substr(7));
  if (token.size() < 24 || token.size() > 256) return "";
  return token;
}

std::string client_fingerprint(const httplib::Request &req) {
  std::string forwarded = req.get_header_value("X-Forwarded-For");
  const auto comma = forwarded.find(',');
  if (comma != std::string::npos) {
    forwarded = forwarded.substr(0, comma);
  }
  forwarded = trim_copy(forwarded);
  const std::string ip = forwarded.empty() ? req.remote_addr : forwarded;
  std::string user_agent = req.get_header_value("User-Agent");
  if (user_agent.size() > 120) user_agent.resize(120);
  return ip + "|" + user_agent;
}

std::optional<int> require_user_id(const httplib::Request &req, httplib::Response &res,
                                   QuashStore &store, const std::string &message) {
  const auto token = bearer_token(req);
  auto user = store.current_user_from_token(token);
  if (!user) {
    send_json(req, res, {{"error", message}}, 401);
    return std::nullopt;
  }
  return user->value("id", 0);
}

void send_route_not_found(const httplib::Request &req, httplib::Response &res) {
  send_json(req, res, {{"error", "Route not found"}}, 404);
}

} // namespace

int main() {
  const fs::path root = fs::current_path();
  const int port = env_int("PORT", kDefaultPort);
  const bool render_style_port = std::getenv("PORT") != nullptr;
  const std::string host = env_string("HOST", render_style_port ? "0.0.0.0" : kDefaultHost);
  const std::string configured_data_dir = env_string("QUASH_DATA_DIR", "");
  const fs::path data_dir =
      configured_data_dir.empty() ? root / "data" : fs::path(configured_data_dir);
  const std::string configured_uploads_dir = env_string("QUASH_UPLOADS_DIR", "");
  const fs::path uploads_dir =
      configured_uploads_dir.empty()
          ? (configured_data_dir.empty() ? root / "uploads" : data_dir / "uploads")
          : fs::path(configured_uploads_dir);
  std::error_code data_ec;
  fs::create_directories(data_dir, data_ec);
  std::error_code uploads_ec;
  fs::create_directories(uploads_dir, uploads_ec);
  if (data_ec) {
    std::cerr << "Could not create data directory " << data_dir << ": "
              << data_ec.message() << "\n";
  }
  if (uploads_ec) {
    std::cerr << "Could not create uploads directory " << uploads_dir << ": "
              << uploads_ec.message() << "\n";
  }
  std::cerr << "Quash data directory: " << data_dir << "\n";
  std::cerr << "Quash uploads directory: " << uploads_dir << "\n";
  QuashStore store(data_dir);

  httplib::Server server;
  server.set_payload_max_length(kMaxUploadBytes + (2 * 1024 * 1024));
  server.set_mount_point("/", root.string());
  server.set_mount_point("/uploads", uploads_dir.string());

  server.set_pre_routing_handler([&](const httplib::Request &req, httplib::Response &res) {
    if (starts_with(req.path, "/data/") || starts_with(req.path, "/cpp_backend/") ||
        req.path == "/server.py" || req.path == "/start-quash.ps1") {
      attach_security_headers(req, res);
      res.status = 404;
      res.set_content("Not found", "text/plain");
      return httplib::Server::HandlerResponse::Handled;
    }

    if (req.method == "OPTIONS" && starts_with(req.path, "/api/")) {
      attach_security_headers(req, res);
      res.status = 204;
      return httplib::Server::HandlerResponse::Handled;
    }
    return httplib::Server::HandlerResponse::Unhandled;
  });

  server.Get("/api/health", [&](const httplib::Request &req, httplib::Response &res) {
    send_json(req, res,
              {{"status", "ok"},
               {"version", "persistent-data-v1"},
               {"persistentData", !configured_data_dir.empty()},
               {"dataDir", data_dir.string()},
               {"uploadsDir", uploads_dir.string()}});
  });

  server.Get("/api/me", [&](const httplib::Request &req, httplib::Response &res) {
    auto me = store.me(bearer_token(req));
    if (!me) {
      send_json(req, res, {{"user", nullptr}}, 401);
      return;
    }
    send_json(req, res, {{"user", *me}});
  });

  server.Get("/api/posts", [&](const httplib::Request &req, httplib::Response &res) {
    const std::string search = req.has_param("q") ? trim_copy(req.get_param_value("q")) : "";
    const std::string topic = req.has_param("topic") ? trim_copy(req.get_param_value("topic")) : "";

    if (search.size() > 120) {
      send_json(req, res, {{"error", "Search query is too long."}}, 400);
      return;
    }
    if (!topic.empty() && !std::regex_match(lower_copy(topic), kTopicRe)) {
      send_json(req, res, {{"error", "Topic format is invalid."}}, 400);
      return;
    }

    std::optional<int> viewer_id;
    if (auto user = store.current_user_from_token(bearer_token(req))) {
      viewer_id = user->value("id", 0);
    }

    std::string error;
    int status = 200;
    send_json(req, res, store.posts(viewer_id, search, topic, error, status), status);
  });

  server.Post("/api/register", [&](const httplib::Request &req, httplib::Response &res) {
    if (!store.allow_rate("register", client_fingerprint(req))) {
      send_json(req, res, {{"error", "Too many account attempts. Please wait and try again."}},
                429);
      return;
    }

    std::string parse_error;
    int parse_status = 400;
    auto body = parse_json_body(req, parse_error, parse_status);
    if (!body) {
      send_json(req, res, {{"error", parse_error}}, parse_status);
      return;
    }

    std::string full_name = trim_copy(body->value("fullName", ""));
    std::string username = trim_copy(body->value("username", ""));
    const std::string email = lower_copy(trim_copy(body->value("email", "")));
    const std::string phone = normalize_phone_number(body->value("phone", ""));
    const std::string password = body->value("password", "");
    std::string bio = trim_copy(body->value("bio", ""));

    if (email.empty() || password.empty()) {
      send_json(req, res, {{"error", "Email and password are required."}}, 400);
      return;
    }
    if (!std::regex_match(email, kEmailRe)) {
      send_json(req, res, {{"error", "Enter a valid email address."}}, 400);
      return;
    }
    if (password.size() < 6) {
      send_json(req, res, {{"error", "Password must be at least 6 characters."}}, 400);
      return;
    }
    if (!username.empty() && !std::regex_match(username, kUsernameRe)) {
      send_json(req, res,
                {{"error", "Username can use letters, numbers, and underscores only."}}, 400);
      return;
    }

    if (full_name.size() > 80) full_name = full_name.substr(0, 80);
    if (bio.empty()) bio = "Connecting with the world on Quash.";
    if (bio.size() > 240) bio = bio.substr(0, 240);

    std::string error;
    int status = 201;
    auto result = store.register_user(full_name, username, email, phone, password, bio, error, status);
    if (!result) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *result, 201);
  });

  server.Post("/api/login", [&](const httplib::Request &req, httplib::Response &res) {
    if (!store.allow_rate("login", client_fingerprint(req))) {
      send_json(req, res, {{"error", "Too many login attempts. Please wait and try again."}},
                429);
      return;
    }

    std::string parse_error;
    int parse_status = 400;
    auto body = parse_json_body(req, parse_error, parse_status);
    if (!body) {
      send_json(req, res, {{"error", parse_error}}, parse_status);
      return;
    }

    const std::string identifier = trim_copy(body->value("identifier", ""));
    const std::string password = body->value("password", "");
    if (identifier.empty() || password.empty()) {
      send_json(req, res, {{"error", "Email, username, phone, and password are required."}}, 400);
      return;
    }

    std::string error;
    int status = 200;
    auto result = store.login_user(identifier, password, error, status);
    if (!result) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *result);
  });

  auto begin_social_auth = [&](const httplib::Request &req, httplib::Response &res,
                               const std::string &provider) {
    const bool is_facebook = provider == "facebook";
    const std::string provider_label = is_facebook ? "Facebook" : "Google";
    const std::string client_id =
        env_string(is_facebook ? "FACEBOOK_APP_ID" : "GOOGLE_CLIENT_ID", "");
    const std::string client_secret =
        env_string(is_facebook ? "FACEBOOK_APP_SECRET" : "GOOGLE_CLIENT_SECRET", "");
    if (client_id.empty() || client_secret.empty()) {
      send_html_message(req, res, provider_label + " sign-in is not configured",
                        provider_label +
                            " sign-in is active in the Quash code, but Render still needs the "
                            "client id and secret environment variables before people can use it.",
                        503);
      return;
    }

    const std::string state = store.create_oauth_state(provider);
    const std::string redirect_uri = oauth_redirect_uri(req, provider);
    httplib::Params params{
        {"client_id", client_id},
        {"redirect_uri", redirect_uri},
        {"response_type", "code"},
        {"state", state},
    };

    std::string auth_url;
    if (is_facebook) {
      params.emplace("scope", "email,public_profile");
      auth_url = "https://www.facebook.com/v19.0/dialog/oauth?" + query_from_params(params);
    } else {
      params.emplace("scope", "openid email profile");
      params.emplace("prompt", "select_account");
      auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + query_from_params(params);
    }
    redirect_to(req, res, auth_url);
  };

  auto finish_social_auth = [&](const httplib::Request &req, httplib::Response &res,
                                const std::string &provider) {
    const bool is_facebook = provider == "facebook";
    const std::string provider_label = is_facebook ? "Facebook" : "Google";
    if (req.has_param("error")) {
      send_html_message(req, res, provider_label + " sign-in was cancelled",
                        req.get_param_value("error"), 400);
      return;
    }

    const std::string code = req.has_param("code") ? req.get_param_value("code") : "";
    const std::string state = req.has_param("state") ? req.get_param_value("state") : "";
    if (code.empty() || state.empty() || !store.consume_oauth_state(provider, state)) {
      send_html_message(req, res, provider_label + " sign-in expired",
                        "Please start sign-in again from Quash.", 400);
      return;
    }

    const std::string client_id =
        env_string(is_facebook ? "FACEBOOK_APP_ID" : "GOOGLE_CLIENT_ID", "");
    const std::string client_secret =
        env_string(is_facebook ? "FACEBOOK_APP_SECRET" : "GOOGLE_CLIENT_SECRET", "");
    if (client_id.empty() || client_secret.empty()) {
      send_html_message(req, res, provider_label + " sign-in is not configured",
                        "The provider secret is missing on Render.", 503);
      return;
    }

    const std::string redirect_uri = oauth_redirect_uri(req, provider);
    std::string error;
    std::optional<json> session;
    int status = 200;

    if (is_facebook) {
      httplib::Client graph("https://graph.facebook.com");
      httplib::Headers headers{{"Accept", "application/json"}};
      httplib::Params token_params{
          {"client_id", client_id},
          {"redirect_uri", redirect_uri},
          {"client_secret", client_secret},
          {"code", code},
      };
      auto token_json =
          provider_json_result(graph.Get("/v19.0/oauth/access_token", token_params, headers),
                               provider_label, error);
      if (!token_json) {
        send_html_message(req, res, provider_label + " sign-in failed", error, 502);
        return;
      }

      const std::string access_token = token_json->value("access_token", "");
      if (access_token.empty()) {
        send_html_message(req, res, provider_label + " sign-in failed",
                          "Facebook did not return an access token.", 502);
        return;
      }

      httplib::Params profile_params{
          {"access_token", access_token},
          {"fields", "id,name,email,picture.type(large)"},
      };
      auto profile_json =
          provider_json_result(graph.Get("/v19.0/me", profile_params, headers), provider_label,
                               error);
      if (!profile_json) {
        send_html_message(req, res, provider_label + " sign-in failed", error, 502);
        return;
      }

      const std::string provider_id = profile_json->value("id", "");
      std::string picture;
      if (profile_json->contains("picture") && (*profile_json)["picture"].is_object()) {
        const auto &picture_obj = (*profile_json)["picture"];
        if (picture_obj.contains("data") && picture_obj["data"].is_object()) {
          picture = picture_obj["data"].value("url", "");
        }
      }
      session = store.login_oauth_user("facebook", provider_id, profile_json->value("email", ""),
                                       profile_json->value("name", ""), picture, error, status);
    } else {
      httplib::Client google_token("https://oauth2.googleapis.com");
      httplib::Headers headers{{"Accept", "application/json"}};
      httplib::Params token_params{
          {"code", code},
          {"client_id", client_id},
          {"client_secret", client_secret},
          {"redirect_uri", redirect_uri},
          {"grant_type", "authorization_code"},
      };
      auto token_json =
          provider_json_result(google_token.Post("/token", headers, token_params),
                               provider_label, error);
      if (!token_json) {
        send_html_message(req, res, provider_label + " sign-in failed", error, 502);
        return;
      }

      const std::string access_token = token_json->value("access_token", "");
      if (access_token.empty()) {
        send_html_message(req, res, provider_label + " sign-in failed",
                          "Google did not return an access token.", 502);
        return;
      }

      httplib::Client google_profile("https://www.googleapis.com");
      httplib::Headers profile_headers{
          {"Accept", "application/json"},
          {"Authorization", "Bearer " + access_token},
      };
      auto profile_json = provider_json_result(
          google_profile.Get("/oauth2/v3/userinfo", profile_headers), provider_label, error);
      if (!profile_json) {
        send_html_message(req, res, provider_label + " sign-in failed", error, 502);
        return;
      }

      if (profile_json->contains("email_verified") &&
          !profile_json->value("email_verified", false)) {
        send_html_message(req, res, provider_label + " sign-in failed",
                          "Google did not confirm this email address.", 403);
        return;
      }
      if (profile_json->value("sub", "").empty() || profile_json->value("email", "").empty()) {
        send_html_message(req, res, provider_label + " sign-in failed",
                          "Google did not return the profile details Quash needs.", 502);
        return;
      }

      session = store.login_oauth_user("google", profile_json->value("sub", ""),
                                       profile_json->value("email", ""),
                                       profile_json->value("name", ""),
                                       profile_json->value("picture", ""), error, status);
    }

    if (!session) {
      send_html_message(req, res, provider_label + " sign-in failed", error, status);
      return;
    }
    redirect_oauth_success(req, res, *session);
  };

  server.Get("/api/auth/google", [&](const httplib::Request &req, httplib::Response &res) {
    begin_social_auth(req, res, "google");
  });

  server.Get("/api/auth/google/callback",
             [&](const httplib::Request &req, httplib::Response &res) {
               finish_social_auth(req, res, "google");
             });

  server.Get("/api/auth/facebook", [&](const httplib::Request &req, httplib::Response &res) {
    begin_social_auth(req, res, "facebook");
  });

  server.Get("/api/auth/facebook/callback",
             [&](const httplib::Request &req, httplib::Response &res) {
               finish_social_auth(req, res, "facebook");
             });

  server.Post("/api/logout", [&](const httplib::Request &req, httplib::Response &res) {
    store.logout_token(bearer_token(req));
    send_json(req, res, {{"ok", true}});
  });

  server.Post("/api/media-upload", [&](const httplib::Request &req, httplib::Response &res) {
    auto user_id =
        require_user_id(req, res, store, "Create an account or sign in before uploading.");
    if (!user_id) return;
    if (!store.allow_rate("write", client_fingerprint(req))) {
      send_json(req, res, {{"error", "Too many write actions. Please wait and try again."}},
                429);
      return;
    }

    if (!req.is_multipart_form_data()) {
      send_json(req, res, {{"error", "Upload must use multipart form data."}}, 400);
      return;
    }

    std::string field_name;
    if (req.form.has_file("media")) {
      field_name = "media";
    } else if (req.form.has_file("file")) {
      field_name = "file";
    } else {
      send_json(req, res, {{"error", "No media file was uploaded."}}, 400);
      return;
    }

    const auto file = req.form.get_file(field_name);
    if (file.content.empty()) {
      send_json(req, res, {{"error", "Uploaded file is empty."}}, 400);
      return;
    }
    if (file.content.size() > kMaxUploadBytes) {
      send_json(req, res, {{"error", "Uploaded file is too large."}}, 413);
      return;
    }

    auto ext = upload_extension_for_content_type(file.content_type);
    if (!ext) {
      send_json(req, res,
                {{"error", "Unsupported media format. Use JPG, PNG, WEBP, GIF, MP4, WEBM, OGG, or MOV."}},
                400);
      return;
    }

    const std::string token = base64url_encode(random_bytes(24));
    const std::string filename = "quash-" + token + *ext;
    const fs::path target_path = uploads_dir / filename;
    if (!write_binary_file(target_path, file.content)) {
      send_json(req, res, {{"error", "Could not save uploaded media."}}, 500);
      return;
    }

    send_json(req, res, {{"mediaUrl", "/uploads/" + filename}, {"bytes", file.content.size()}},
              201);
  });

  server.Post("/api/posts", [&](const httplib::Request &req, httplib::Response &res) {
    auto user_id =
        require_user_id(req, res, store, "Create an account or sign in before posting.");
    if (!user_id) return;
    if (!store.allow_rate("write", client_fingerprint(req))) {
      send_json(req, res, {{"error", "Too many write actions. Please wait and try again."}},
                429);
      return;
    }

    std::string parse_error;
    int parse_status = 400;
    auto body_json = parse_json_body(req, parse_error, parse_status);
    if (!body_json) {
      send_json(req, res, {{"error", parse_error}}, parse_status);
      return;
    }

    std::string post_type = trim_copy(body_json->value("postType", "Text"));
    if (post_type.size() > 24) post_type.resize(24);
    if (post_type.empty()) post_type = "Text";

    const std::string body = trim_copy(body_json->value("body", ""));
    const std::string media_url = trim_copy(body_json->value("mediaUrl", ""));
    std::optional<int> duration_seconds;
    if (body_json->contains("durationSeconds") && !(*body_json)["durationSeconds"].is_null()) {
      const auto &duration_value = (*body_json)["durationSeconds"];
      if (!duration_value.is_number()) {
        send_json(req, res, {{"error", "Video duration must be a number of seconds."}}, 400);
        return;
      }
      const int parsed_duration = static_cast<int>(duration_value.get<double>());
      if (parsed_duration <= 0 || parsed_duration > 60 * 60) {
        send_json(req, res, {{"error", "Video duration is invalid."}}, 400);
        return;
      }
      duration_seconds = parsed_duration;
    }

    if (body.size() > kMaxPostBodyChars) {
      send_json(req, res, {{"error", "Post text is too long."}}, 400);
      return;
    }
    if (media_url.size() > kMaxMediaUrlChars) {
      send_json(req, res, {{"error", "Media URL is too long."}}, 400);
      return;
    }
    if (!media_url.empty() && !std::regex_search(media_url, kHttpUrlRe) &&
        !starts_with(media_url, "/uploads/")) {
      send_json(req, res,
                {{"error", "Media URL must start with http://, https://, or /uploads/"}},
                400);
      return;
    }
    if (body.empty() && media_url.empty()) {
      send_json(req, res,
                {{"error", "Write something or add media before notifying people."}}, 400);
      return;
    }

    std::string error;
    int status = 201;
    auto created =
        store.create_post(*user_id, post_type, body, media_url, duration_seconds, error, status);
    if (!created) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *created, 201);
  });

  server.Get("/api/my-activity", [&](const httplib::Request &req, httplib::Response &res) {
    auto user_id = require_user_id(req, res, store, "Sign in to view your profile activity.");
    if (!user_id) return;

    std::string error;
    int status = 200;
    auto activity = store.my_activity(*user_id, error, status);
    if (!activity) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *activity);
  });

  server.Get("/api/users/:id/profile", [&](const httplib::Request &req, httplib::Response &res) {
    const auto id_text = req.path_params.at("id");
    if (!std::regex_match(id_text, std::regex(R"(^\d+$)"))) {
      send_json(req, res, {{"error", "Invalid user id."}}, 400);
      return;
    }

    std::optional<int> viewer_id;
    if (auto user = store.current_user_from_token(bearer_token(req))) {
      viewer_id = user->value("id", 0);
    }

    std::string error;
    int status = 200;
    auto profile = store.user_profile(std::stoi(id_text), viewer_id, error, status);
    if (!profile) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *profile);
  });

  server.Post("/api/posts/:id/like", [&](const httplib::Request &req, httplib::Response &res) {
    auto user_id = require_user_id(req, res, store, "Sign in before liking posts.");
    if (!user_id) return;
    if (!store.allow_rate("write", client_fingerprint(req))) {
      send_json(req, res, {{"error", "Too many write actions. Please wait and try again."}},
                429);
      return;
    }

    const auto id_text = req.path_params.at("id");
    if (!std::regex_match(id_text, std::regex(R"(^\d+$)"))) {
      send_json(req, res, {{"error", "Invalid post id."}}, 400);
      return;
    }

    std::string error;
    int status = 200;
    auto result = store.like_post(*user_id, std::stoi(id_text), error, status);
    if (!result) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *result);
  });

  server.Post("/api/posts/:id/comments",
              [&](const httplib::Request &req, httplib::Response &res) {
                auto user_id = require_user_id(req, res, store, "Sign in before commenting.");
                if (!user_id) return;
                if (!store.allow_rate("write", client_fingerprint(req))) {
                  send_json(
                      req, res,
                      {{"error", "Too many write actions. Please wait and try again."}}, 429);
                  return;
                }

                const auto id_text = req.path_params.at("id");
                if (!std::regex_match(id_text, std::regex(R"(^\d+$)"))) {
                  send_json(req, res, {{"error", "Invalid post id."}}, 400);
                  return;
                }

                std::string parse_error;
                int parse_status = 400;
                auto body_json = parse_json_body(req, parse_error, parse_status);
                if (!body_json) {
                  send_json(req, res, {{"error", parse_error}}, parse_status);
                  return;
                }

                const std::string body = trim_copy(body_json->value("body", ""));
                if (body.empty()) {
                  send_json(req, res, {{"error", "Write a comment before posting."}}, 400);
                  return;
                }
                if (body.size() > kMaxCommentBodyChars) {
                  send_json(req, res, {{"error", "Comment is too long."}}, 400);
                  return;
                }

                std::string error;
                int status = 201;
                auto result =
                    store.create_comment(*user_id, std::stoi(id_text), body, error, status);
                if (!result) {
                  send_json(req, res, {{"error", error}}, status);
                  return;
                }
                send_json(req, res, *result, 201);
              });

  server.Post("/api/posts/:id/share",
              [&](const httplib::Request &req, httplib::Response &res) {
                auto user_id =
                    require_user_id(req, res, store, "Sign in before sharing posts.");
                if (!user_id) return;
                if (!store.allow_rate("write", client_fingerprint(req))) {
                  send_json(
                      req, res,
                      {{"error", "Too many write actions. Please wait and try again."}}, 429);
                  return;
                }

                const auto id_text = req.path_params.at("id");
                if (!std::regex_match(id_text, std::regex(R"(^\d+$)"))) {
                  send_json(req, res, {{"error", "Invalid post id."}}, 400);
                  return;
                }

                std::string error;
                int status = 200;
                auto result = store.share_post(*user_id, std::stoi(id_text), error, status);
                if (!result) {
                  send_json(req, res, {{"error", error}}, status);
                  return;
                }
                send_json(req, res, *result);
              });

  server.Post("/api/users/:id/follow",
              [&](const httplib::Request &req, httplib::Response &res) {
                auto user_id =
                    require_user_id(req, res, store, "Sign in before following people.");
                if (!user_id) return;
                if (!store.allow_rate("write", client_fingerprint(req))) {
                  send_json(
                      req, res,
                      {{"error", "Too many write actions. Please wait and try again."}}, 429);
                  return;
                }

                const auto id_text = req.path_params.at("id");
                if (!std::regex_match(id_text, std::regex(R"(^\d+$)"))) {
                  send_json(req, res, {{"error", "Invalid user id."}}, 400);
                  return;
                }

                std::string error;
                int status = 200;
                auto result = store.follow_user(*user_id, std::stoi(id_text), error, status);
                if (!result) {
                  send_json(req, res, {{"error", error}}, status);
                  return;
                }
                send_json(req, res, *result);
              });

  server.Post("/api/topics/:topic/follow",
              [&](const httplib::Request &req, httplib::Response &res) {
                auto user_id =
                    require_user_id(req, res, store, "Sign in before following topics.");
                if (!user_id) return;
                if (!store.allow_rate("write", client_fingerprint(req))) {
                  send_json(
                      req, res,
                      {{"error", "Too many write actions. Please wait and try again."}}, 429);
                  return;
                }

                const auto topic = lower_copy(trim_copy(req.path_params.at("topic")));
                if (!std::regex_match(topic, kTopicRe)) {
                  send_json(req, res, {{"error", "Topic format is invalid."}}, 400);
                  return;
                }

                std::string error;
                int status = 200;
                auto result = store.follow_topic(*user_id, topic, error, status);
                if (!result) {
                  send_json(req, res, {{"error", error}}, status);
                  return;
                }
                send_json(req, res, *result);
              });

  server.Get("/api/topics/:topic", [&](const httplib::Request &req, httplib::Response &res) {
    const auto topic = lower_copy(trim_copy(req.path_params.at("topic")));
    if (!std::regex_match(topic, kTopicRe)) {
      send_json(req, res, {{"error", "Topic format is invalid."}}, 400);
      return;
    }

    std::optional<int> viewer_id;
    if (auto user = store.current_user_from_token(bearer_token(req))) {
      viewer_id = user->value("id", 0);
    }

    send_json(req, res, store.topic(topic, viewer_id));
  });

  server.Get("/api/notifications", [&](const httplib::Request &req, httplib::Response &res) {
    auto user = store.current_user_from_token(bearer_token(req));
    if (!user) {
      send_json(req, res, {{"notifications", json::array()}, {"unreadCount", 0}});
      return;
    }
    send_json(req, res, store.notifications(user->value("id", 0)));
  });

  server.Post("/api/notifications/read",
              [&](const httplib::Request &req, httplib::Response &res) {
                auto user = store.current_user_from_token(bearer_token(req));
                if (user) {
                  store.mark_notifications_read(user->value("id", 0));
                }
                send_json(req, res, {{"ok", true}});
              });

  server.Get("/api/messages", [&](const httplib::Request &req, httplib::Response &res) {
    auto user_id = require_user_id(req, res, store, "Sign in to view messages.");
    if (!user_id) return;

    std::string error;
    int status = 200;
    auto result = store.conversations(*user_id, error, status);
    if (!result) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *result);
  });

  server.Get("/api/messages/:id", [&](const httplib::Request &req, httplib::Response &res) {
    auto user_id = require_user_id(req, res, store, "Sign in to view messages.");
    if (!user_id) return;

    const auto id_text = req.path_params.at("id");
    if (!std::regex_match(id_text, std::regex(R"(^\d+$)"))) {
      send_json(req, res, {{"error", "Invalid user id."}}, 400);
      return;
    }

    std::string error;
    int status = 200;
    auto result = store.conversation(*user_id, std::stoi(id_text), error, status);
    if (!result) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *result);
  });

  server.Post("/api/messages/:id", [&](const httplib::Request &req, httplib::Response &res) {
    auto user_id = require_user_id(req, res, store, "Sign in before sending messages.");
    if (!user_id) return;
    if (!store.allow_rate("write", client_fingerprint(req))) {
      send_json(req, res, {{"error", "Too many write actions. Please wait and try again."}},
                429);
      return;
    }

    const auto id_text = req.path_params.at("id");
    if (!std::regex_match(id_text, std::regex(R"(^\d+$)"))) {
      send_json(req, res, {{"error", "Invalid user id."}}, 400);
      return;
    }

    std::string parse_error;
    int parse_status = 400;
    auto body_json = parse_json_body(req, parse_error, parse_status);
    if (!body_json) {
      send_json(req, res, {{"error", parse_error}}, parse_status);
      return;
    }

    const std::string body = trim_copy(body_json->value("body", ""));
    if (body.empty()) {
      send_json(req, res, {{"error", "Write a message before sending."}}, 400);
      return;
    }
    if (body.size() > kMaxMessageBodyChars) {
      send_json(req, res, {{"error", "Message is too long."}}, 400);
      return;
    }

    std::string error;
    int status = 201;
    auto result = store.create_message(*user_id, std::stoi(id_text), body, error, status);
    if (!result) {
      send_json(req, res, {{"error", error}}, status);
      return;
    }
    send_json(req, res, *result, 201);
  });

  server.Get("/api/search", [&](const httplib::Request &req, httplib::Response &res) {
    const std::string query = req.has_param("q") ? trim_copy(req.get_param_value("q")) : "";
    if (query.empty()) {
      send_json(req, res, {{"posts", json::array()}, {"users", json::array()}});
      return;
    }
    if (query.size() > 120) {
      send_json(req, res, {{"error", "Search query is too long."}}, 400);
      return;
    }

    std::optional<int> viewer_id;
    if (auto user = store.current_user_from_token(bearer_token(req))) {
      viewer_id = user->value("id", 0);
    }

    send_json(req, res, store.search(viewer_id, query));
  });

  server.Get(R"(/api/.*)", [&](const httplib::Request &req, httplib::Response &res) {
    send_route_not_found(req, res);
  });
  server.Post(R"(/api/.*)", [&](const httplib::Request &req, httplib::Response &res) {
    send_route_not_found(req, res);
  });
  server.Options(R"(/api/.*)", [&](const httplib::Request &req, httplib::Response &res) {
    attach_security_headers(req, res);
    res.status = 204;
  });

  server.set_error_handler([&](const httplib::Request &req, httplib::Response &res) {
    attach_security_headers(req, res);
    if (starts_with(req.path, "/api/")) {
      if (!res.body.empty()) {
        return;
      }
      if (res.status == 404) {
        send_route_not_found(req, res);
      } else {
        send_json(req, res, {{"error", "Request failed."}}, res.status);
      }
    }
  });

  std::cout << "Quash C++ server running at http://" << host << ":" << port << "\n";
  std::cout << "Data file: " << (root / "data" / "quash_cpp.json").string() << "\n";
  if (!server.listen(host, port)) {
    std::cerr << "Failed to start server on " << host << ":" << port << "\n";
    return 1;
  }
  return 0;
}
