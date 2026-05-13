enum Environment {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

enum AuthProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  GITHUB = 'github',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
}

enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

enum TemplateCategory {
  NETWORKING = 'networking',
  MEDIA = 'media',
  VIRTUALIZATION = 'virtualization',
  STORAGE = 'storage',
  MONITORING = 'monitoring',
  HOME_AUTOMATION = 'home-automation',
  GENERAL = 'general',
}

enum GallerySort {
  RECENT = 'recent',
  POPULAR = 'popular',
  TRENDING = 'trending',
  MOST_FORKED = 'most_forked',
}

export { Environment, Visibility, AuthProvider, TemplateCategory, GallerySort }
